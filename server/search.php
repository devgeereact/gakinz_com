<?php
/**
 * Record search (docs/PRODUCT-SPEC.md 7 "Record search across clients and
 * projects"). Finds a client, project, enquiry, invoice or quote by a few
 * typed characters, so the owner can open the right record from a phone.
 * Read only: nothing here changes a record, so nothing is audited.
 *
 *   GET /search.php?q=acme → {
 *     query: "acme",
 *     types: { client: "ok", project: "ok", enquiry: "unavailable", ... },
 *     results: [ { type, id, title, secondary, route }, ... ]
 *   }
 *
 * The query is trimmed, then must be 2 to 80 characters (400 otherwise). It
 * is matched as a plain substring: `%`, `_` and `\` are escaped and the LIKE
 * carries an explicit ESCAPE clause, so a typed `%` matches a percent sign and
 * never everything. Every query is a prepared statement and only rows with
 * `deleted_at IS NULL` are searched.
 *
 * Fields searched, at most SEARCH_PER_TYPE results per type, newest first:
 *
 *   client   company, contact name, email        → /app/clients
 *   project  name                                 → /app/projects?project=<id>
 *   enquiry  name, company, email                 → /app/leads?enquiry=<id>
 *   invoice  number                               → /app/invoicing?invoice=<id>
 *   quote    title (proposals have no number)     → /app/proposals
 *
 * Each result carries only an id, a title, a short secondary line (contact,
 * client company, status) and the CMS route that holds the record. Never a
 * note, a message body, a budget or any financial amount.
 *
 * Roles: the endpoint admits the union of the roles below; a client or a
 * trainer gets 403. Each type then mirrors the role constant of the endpoint
 * that owns its data, exactly, so a role that cannot open invoices never gets
 * invoice results. A type the caller cannot read is absent from `types` and
 * contributes no results. Keep SEARCH_TYPES in step with those constants:
 *
 *   client   clients.php   STAFF  super_admin, admin, manager, editor
 *   project  projects.php  STAFF  super_admin, admin, manager, editor, employee
 *   enquiry  leads.php     STAFF  super_admin, admin, manager, editor
 *   invoice  invoices.php  STAFF  super_admin, admin, manager
 *   quote    proposals.php STAFF  super_admin, admin, manager, editor
 *
 * Failure: each type runs on its own. A failed query marks only that type
 * `unavailable` and adds no results for it.
 */
require __DIR__ . '/_bootstrap.php';

const SEARCH_MIN = 2;
const SEARCH_MAX = 80;
const SEARCH_PER_TYPE = 8;
const SEARCH_CLIENTS_ROLES = ['super_admin', 'admin', 'manager', 'editor'];               // clients.php STAFF
const SEARCH_PROJECTS_ROLES = ['super_admin', 'admin', 'manager', 'editor', 'employee'];  // projects.php STAFF
const SEARCH_LEADS_ROLES = ['super_admin', 'admin', 'manager', 'editor'];                 // leads.php STAFF
const SEARCH_INVOICES_ROLES = ['super_admin', 'admin', 'manager'];                        // invoices.php STAFF
const SEARCH_PROPOSALS_ROLES = ['super_admin', 'admin', 'manager', 'editor'];             // proposals.php STAFF
const SEARCH_TYPES = [
  'client'  => SEARCH_CLIENTS_ROLES,
  'project' => SEARCH_PROJECTS_ROLES,
  'enquiry' => SEARCH_LEADS_ROLES,
  'invoice' => SEARCH_INVOICES_ROLES,
  'quote'   => SEARCH_PROPOSALS_ROLES,
];

/** A LIKE pattern that matches $q literally anywhere: \ % _ escaped with \. */
function sr_pattern(string $q): string {
  return '%' . strtr($q, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_']) . '%';
}

/** Rows of a prepared query whose every parameter is the same pattern. Throws on failure. */
function sr_rows(mysqli $conn, string $sql, string $pattern, int $count): array {
  $s = $conn->prepare($sql);
  if ($s === false) throw new RuntimeException('prepare failed: ' . $conn->errno);
  $args = array_fill(0, $count, $pattern);
  $s->bind_param(str_repeat('s', $count), ...$args);
  if (!$s->execute()) throw new RuntimeException('execute failed: ' . $s->errno);
  $res = $s->get_result();
  if ($res === false) throw new RuntimeException('no result: ' . $s->errno);
  return $res->fetch_all(MYSQLI_ASSOC);
}

/** The non-empty parts joined with ", ". */
function sr_join(array $parts): string {
  $kept = array_values(array_filter(array_map(fn($v) => trim((string)$v), $parts), fn($v) => $v !== ''));
  return implode(', ', $kept);
}

/** A stored status as words: "in_progress" → "in progress". */
function sr_status(?string $s): string {
  return str_replace('_', ' ', trim((string)$s));
}

function sr_result(string $type, $id, string $title, string $secondary, string $route): array {
  return ['type' => $type, 'id' => (int)$id, 'title' => $title, 'secondary' => $secondary, 'route' => $route];
}

/** One type's results. Each may throw. */
function sr_type(mysqli $conn, string $type, string $p): array {
  $like = " LIKE ? ESCAPE '\\\\'";
  $limit = ' LIMIT ' . SEARCH_PER_TYPE;
  switch ($type) {
    case 'client': {
      $rows = sr_rows($conn, 'SELECT id, company, contact_name, email FROM clients
        WHERE deleted_at IS NULL AND (company' . $like . ' OR contact_name' . $like . ' OR email' . $like . ')
        ORDER BY id DESC' . $limit, $p, 3);
      return array_map(fn($r) => sr_result('client', $r['id'], (string)$r['company'],
        sr_join([$r['contact_name'], $r['email']]), '/app/clients'), $rows);
    }
    case 'project': {
      $rows = sr_rows($conn, 'SELECT p.id, p.name, p.status, c.company FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id AND c.deleted_at IS NULL
        WHERE p.deleted_at IS NULL AND p.name' . $like . '
        ORDER BY p.id DESC' . $limit, $p, 1);
      return array_map(fn($r) => sr_result('project', $r['id'], (string)$r['name'],
        sr_join([$r['company'], sr_status($r['status'])]), '/app/projects?project=' . (int)$r['id']), $rows);
    }
    case 'enquiry': {
      $rows = sr_rows($conn, 'SELECT id, name, company, email, status FROM enquiries
        WHERE deleted_at IS NULL AND (name' . $like . ' OR company' . $like . ' OR email' . $like . ')
        ORDER BY id DESC' . $limit, $p, 3);
      return array_map(fn($r) => sr_result('enquiry', $r['id'], sr_join([$r['name'], $r['company']]) ?: 'Unnamed',
        sr_join([$r['email'], sr_status($r['status'])]), '/app/leads?enquiry=' . (int)$r['id']), $rows);
    }
    case 'invoice': {
      $rows = sr_rows($conn, 'SELECT i.id, i.number, i.status, c.company FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id AND c.deleted_at IS NULL
        WHERE i.deleted_at IS NULL AND i.number' . $like . '
        ORDER BY i.id DESC' . $limit, $p, 1);
      return array_map(fn($r) => sr_result('invoice', $r['id'], (string)($r['number'] ?: 'Invoice #' . $r['id']),
        sr_join([$r['company'], sr_status($r['status'])]), '/app/invoicing?invoice=' . (int)$r['id']), $rows);
    }
    case 'quote': {
      $rows = sr_rows($conn, 'SELECT p.id, p.title, p.status, c.company FROM proposals p
        LEFT JOIN clients c ON c.id = p.client_id AND c.deleted_at IS NULL
        WHERE p.deleted_at IS NULL AND p.title' . $like . '
        ORDER BY p.id DESC' . $limit, $p, 1);
      return array_map(fn($r) => sr_result('quote', $r['id'], (string)$r['title'],
        sr_join([$r['company'], sr_status($r['status'])]), '/app/proposals'), $rows);
    }
  }
  throw new RuntimeException('unknown type');
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') fail('Method not allowed.', 405);

$allRoles = array_values(array_unique(array_merge(...array_values(SEARCH_TYPES))));
$user = require_auth($conn, $allRoles); // staff only; a client or trainer gets 403

$raw = $_GET['q'] ?? '';
$q = is_string($raw) ? trim($raw) : '';
$len = mb_strlen($q, 'UTF-8');
if ($len < SEARCH_MIN) fail('Type at least ' . SEARCH_MIN . ' characters to search.');
if ($len > SEARCH_MAX) fail('Search for ' . SEARCH_MAX . ' characters or fewer.');

$pattern = sr_pattern($q);
$types = [];
$results = [];
foreach (SEARCH_TYPES as $type => $roles) {
  if (!in_array($user['role'], $roles, true)) continue; // absent: this role cannot read the source
  try {
    $found = sr_type($conn, $type, $pattern);
    $types[$type] = 'ok';
    array_push($results, ...$found);
  } catch (Throwable $e) {
    error_log('search.php ' . $type . ' unavailable: ' . $e->getMessage());
    $types[$type] = 'unavailable';
  }
}

ok(['query' => $q, 'types' => (object)$types, 'results' => $results]);
