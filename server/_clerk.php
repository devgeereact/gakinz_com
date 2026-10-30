<?php
/**
 * GAkinz: Clerk sign-in (email code only).
 *
 * Roles stay in `users` (staff and portal clients alike); Clerk only proves WHO is calling. A verified token maps to a staff row:
 *   1. users.clerk_user_id equals the token's `sub`;
 *   2. first sign-in only: an active staff row whose email equals the token's verified `email`
 *      claim and whose clerk_user_id is still empty is linked (never re-linked to a different
 *      Clerk user);
 *   3. anyone else gets nothing (401). Clerk sign-up never creates users. Magic-link and reference
 *      portal sign-ins are separate flows and are unchanged.
 * Loaded lazily by require_auth() (_bootstrap.php) only when the bearer looks like a JWT.
 */
declare(strict_types=1);


final class GkClerkJwt
{
    private const LEEWAY = 5;

    /**
     * @param string[] $authorizedParties exact allowed values of the "azp" claim (origins)
     * @param callable(string):string $fetch returns the JWKS JSON for a URL (injected for tests)
     */
    public function __construct(
        private readonly string $issuer,
        private readonly array $authorizedParties,
        private readonly string $cacheDir,
        private $fetch,
        private readonly int $now = 0,
    ) {
        if (!str_starts_with($issuer, "https://") || str_ends_with($issuer, "/")) {
            throw new InvalidArgumentException("Issuer must be an https URL without trailing slash");
        }
    }

    /** @return array<string,mixed> verified claims */
    public function verify(string $token): array
    {
        $parts = explode(".", $token);
        if (count($parts) !== 3 || strlen($token) > 8192) throw new RuntimeException("bad token");
        [$h, $p, $s] = $parts;
        $header = self::json($h);
        $claims = self::json($p);
        $sig = self::b64($s);
        if ($header === null || $claims === null || $sig === null
            || ($header["alg"] ?? null) !== "RS256" || !is_string($header["kid"] ?? null)) {
            throw new RuntimeException("bad token");
        }
        $pem = $this->pemForKid($header["kid"]);
        if ($pem === null || openssl_verify($h . "." . $p, $sig, $pem, OPENSSL_ALGO_SHA256) !== 1) {
            throw new RuntimeException("bad signature");
        }
        $now = $this->now ?: time();
        $exp = $claims["exp"] ?? null;
        $nbf = $claims["nbf"] ?? null;
        $azp = $claims["azp"] ?? null;
        if (($claims["iss"] ?? null) !== $this->issuer
            || !is_int($exp) || $exp < $now - self::LEEWAY
            || ($nbf !== null && (!is_int($nbf) || $nbf > $now + self::LEEWAY))
            || !is_string($claims["sub"] ?? null) || $claims["sub"] === ""
            || !is_string($azp) || !in_array($azp, $this->authorizedParties, true)) {
            throw new RuntimeException("bad claims");
        }
        return $claims;
    }

    private function pemForKid(string $kid): ?string
    {
        $jwk = self::find($this->jwks(false), $kid);
        if ($jwk === null) {
            // Unknown kid: keys may have rotated. Refresh at most once a minute.
            $jwk = self::find($this->jwks(true), $kid);
        }
        return $jwk === null ? null : self::jwkToPem($jwk);
    }

    /** @return list<array<string,mixed>> */
    private function jwks(bool $forceRefresh): array
    {
        $file = $this->cacheDir . "/clerk-jwks-" . hash("sha256", $this->issuer) . ".json";
        $cached = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        $age = is_array($cached) ? ($this->now ?: time()) - (int) ($cached["fetched_at"] ?? 0) : PHP_INT_MAX;
        if (is_array($cached) && $age < 3600 && !$forceRefresh) return $cached["keys"];
        if ($forceRefresh && is_array($cached) && $age < 60) return $cached["keys"];
        $failFile = $file . ".failed";
        if (is_file($failFile) && ($this->now ?: time()) - (int) @filemtime($failFile) < 30) {
            return is_array($cached) ? $cached["keys"] : []; // recent failure: do not wait on the network again yet
        }
        try {
            $doc = json_decode(($this->fetch)($this->issuer . "/.well-known/jwks.json"), true);
        } catch (Throwable) {
            $doc = null;
        }
        $writable = is_dir($this->cacheDir) && is_writable($this->cacheDir);
        if (!is_array($doc) || !is_array($doc["keys"] ?? null)) {
            if ($writable) @touch($failFile);
            return is_array($cached) ? $cached["keys"] : [];
        }
        if ($writable) {
            @file_put_contents($file, json_encode(["fetched_at" => $this->now ?: time(), "keys" => $doc["keys"]]), LOCK_EX);
        }
        return $doc["keys"];
    }

    /** @param list<array<string,mixed>> $keys */
    private static function find(array $keys, string $kid): ?array
    {
        foreach ($keys as $k) {
            if (is_array($k) && ($k["kid"] ?? null) === $kid && ($k["kty"] ?? null) === "RSA"
                && is_string($k["n"] ?? null) && is_string($k["e"] ?? null)) return $k;
        }
        return null;
    }

    /** @param array<string,mixed> $jwk */
    public static function jwkToPem(array $jwk): ?string
    {
        $n = self::b64((string) $jwk["n"]);
        $e = self::b64((string) $jwk["e"]);
        if ($n === null || $e === null || $n === "" || $e === "") return null;
        $rsaKey = self::seq(self::int($n) . self::int($e));
        $algo = hex2bin("300d06092a864886f70d0101010500");
        $spki = self::seq($algo . "\x03" . self::len(strlen($rsaKey) + 1) . "\x00" . $rsaKey);
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function len(int $n): string
    {
        if ($n < 128) return chr($n);
        $b = ltrim(pack("N", $n), "\0");
        return chr(0x80 | strlen($b)) . $b;
    }

    private static function seq(string $c): string { return "\x30" . self::len(strlen($c)) . $c; }

    private static function int(string $v): string
    {
        $v = ltrim($v, "\0");
        if ($v === "" || (ord($v[0]) & 0x80)) $v = "\0" . $v;
        return "\x02" . self::len(strlen($v)) . $v;
    }

    private static function b64(string $s): ?string
    {
        if ($s === "" || preg_match('/^[A-Za-z0-9_-]+$/', $s) !== 1) return null;
        $r = base64_decode(strtr($s, "-_", "+/") . str_repeat("=", (4 - strlen($s) % 4) % 4), true);
        return $r === false ? null : $r;
    }

    /** @return array<string,mixed>|null */
    private static function json(string $b64): ?array
    {
        $raw = self::b64($b64);
        $d = $raw === null ? null : json_decode($raw, true);
        return is_array($d) ? $d : null;
    }
}

/** Does this bearer look like a JWT (three dot-separated parts) rather than a 64-hex session token? */
function gk_clerk_looks_like_jwt(string $tok): bool { return substr_count($tok, '.') === 2; }

/** Config may be a define() or a config.php global, like the other settings in this project. */
function gk_clerk_setting(string $name, $default = '') {
  if (defined($name)) return constant($name);
  return $GLOBALS[$name] ?? $default;
}

function gk_clerk_configured(): bool {
  $parties = gk_clerk_setting('CLERK_AUTHORIZED_PARTIES', []);
  return gk_clerk_setting('CLERK_ISSUER', '') !== '' && is_array($parties) && count($parties) > 0;
}

function gk_clerk_fetch_json(string $url): string {
  $ctx = stream_context_create(['http' => ['timeout' => 5], 'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
  $r = @file_get_contents($url, false, $ctx);
  if ($r === false) throw new RuntimeException('jwks fetch failed');
  return $r;
}

function gk_clerk_verifier(): GkClerkJwt {
  $dir = (string) gk_clerk_setting('CLERK_CACHE_DIR', dirname(__DIR__, 2) . '/gk_private/cache');
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  return new GkClerkJwt((string) gk_clerk_setting('CLERK_ISSUER', ''), (array) gk_clerk_setting('CLERK_AUTHORIZED_PARTIES', []), $dir, 'gk_clerk_fetch_json');
}

/**
 * Verified claims to an active user row (the columns require_auth() returns), linking on first
 * sign-in. Null when the person is not approved. Pass only claims from GkClerkJwt::verify().
 * Suspended users are returned as they are: require_auth() answers 403 for them, as for any session.
 */
function gk_clerk_resolve_user(mysqli $conn, array $claims): ?array {
  $cols = 'id, name, email, role, client_id, status';
  $sub = (string) ($claims['sub'] ?? '');
  if ($sub === '' || strlen($sub) > 64) return null;
  $st = $conn->prepare("SELECT $cols FROM users WHERE clerk_user_id = ? AND deleted_at IS NULL LIMIT 1");
  $st->bind_param('s', $sub); $st->execute();
  $u = $st->get_result()->fetch_assoc();
  if ($u) return $u;
  $email = strtolower(trim((string) ($claims['email'] ?? '')));
  if ($email === '' || strlen($email) > 200 || !filter_var($email, FILTER_VALIDATE_EMAIL)) return null;
  $st = $conn->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND clerk_user_id IS NULL AND deleted_at IS NULL AND status = 'active' LIMIT 1");
  $st->bind_param('s', $email); $st->execute();
  $row = $st->get_result()->fetch_assoc();
  if (!$row) return null;
  $id = (int) $row['id'];
  $st = $conn->prepare('UPDATE users SET clerk_user_id = ? WHERE id = ? AND clerk_user_id IS NULL');
  $st->bind_param('si', $sub, $id); $st->execute();
  if ($st->affected_rows !== 1) return null; // lost a race: someone else linked it
  $st = $conn->prepare("SELECT $cols FROM users WHERE id = ? AND deleted_at IS NULL");
  $st->bind_param('i', $id); $st->execute();
  return $st->get_result()->fetch_assoc() ?: null;
}

/** Bearer JWT to user row, or null. Never throws. */
function gk_clerk_user_from_token(mysqli $conn, string $tok): ?array {
  if (!gk_clerk_configured()) return null;
  try { $claims = gk_clerk_verifier()->verify($tok); } catch (Throwable $e) { return null; }
  return gk_clerk_resolve_user($conn, $claims);
}
