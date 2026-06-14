<?php
/**
 * GitHub connector (GAkinzOS — Dev Pipeline). Protected.
 * Pulls recent commits, open PRs and the latest Actions run for a repo. Works on
 * public repos without a token; set $GITHUB_TOKEN in config.php for private repos
 * and higher rate limits.
 *
 *   GET /github.php?url=<repo_url>   → { repo, commits[], pulls[], run }
 *
 * Degrades: 503 if cURL is missing; clear error if the URL isn't a GitHub repo.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
require_auth($conn, STAFF);
if (!function_exists('curl_init')) fail('The GitHub connector needs the PHP cURL extension.', 503);

$url = trim($_GET['url'] ?? '');
if (!preg_match('#github\.com[/:]([\w.-]+)/([\w.-]+?)(?:\.git)?/?$#i', $url, $m)) {
  fail('That is not a GitHub repository URL.');
}
$owner = $m[1];
$repo = $m[2];

function gh_get(string $path) {
  $token = $GLOBALS['GITHUB_TOKEN'] ?? '';
  $ch = curl_init('https://api.github.com' . $path);
  $headers = ['Accept: application/vnd.github+json', 'User-Agent: GAkinzOS'];
  if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 12,
  ]);
  $body = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, json_decode((string)$body, true)];
}

$base = "/repos/$owner/$repo";

[$rc, $repoData] = gh_get($base);
if ($rc === 404) fail('Repository not found (or private without a token).', 404);
if ($rc === 403) fail('GitHub rate limit reached. Add a $GITHUB_TOKEN in config.', 429);
if ($rc >= 400 || !is_array($repoData)) fail('Could not reach GitHub.', 502);

$commits = [];
[$cc, $cData] = gh_get("$base/commits?per_page=5");
if ($cc < 400 && is_array($cData)) {
  foreach ($cData as $c) {
    $commits[] = [
      'sha'     => substr($c['sha'] ?? '', 0, 7),
      'message' => strtok((string)($c['commit']['message'] ?? ''), "\n"),
      'author'  => $c['commit']['author']['name'] ?? '',
      'date'    => $c['commit']['author']['date'] ?? '',
      'url'     => $c['html_url'] ?? '',
    ];
  }
}

$pulls = [];
[$pc, $pData] = gh_get("$base/pulls?state=open&per_page=5");
if ($pc < 400 && is_array($pData)) {
  foreach ($pData as $p) {
    $pulls[] = [
      'number' => (int)($p['number'] ?? 0),
      'title'  => $p['title'] ?? '',
      'author' => $p['user']['login'] ?? '',
      'url'    => $p['html_url'] ?? '',
    ];
  }
}

$run = null;
[$rrc, $rData] = gh_get("$base/actions/runs?per_page=1");
if ($rrc < 400 && !empty($rData['workflow_runs'][0])) {
  $r = $rData['workflow_runs'][0];
  $run = [
    'name'       => $r['name'] ?? ($r['display_title'] ?? 'CI'),
    'status'     => $r['status'] ?? '',        // queued | in_progress | completed
    'conclusion' => $r['conclusion'] ?? '',    // success | failure | …
    'url'        => $r['html_url'] ?? '',
    'date'       => $r['updated_at'] ?? '',
  ];
}

ok([
  'repo'        => $owner . '/' . $repo,
  'url'         => $repoData['html_url'] ?? $url,
  'default_branch' => $repoData['default_branch'] ?? 'main',
  'open_issues' => (int)($repoData['open_issues_count'] ?? 0),
  'commits'     => $commits,
  'pulls'       => $pulls,
  'run'         => $run,
]);
