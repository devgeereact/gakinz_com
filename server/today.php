<?php
/**
 * Today attention list (docs/PRODUCT-SPEC.md 5.5 "Dashboard to Today" and 7
 * "Today screen"). One read that answers "what needs me next" without opening
 * six screens. Read only: nothing here changes a record, so nothing is audited.
 *
 *   GET /today.php → {
 *     generated_at: "2026-10-19T08:30:00Z",          // database clock, UTC
 *     sections: {
 *       <key>: { status: "ok", count: 3, items: [...] }
 *            | { status: "unavailable", count: null, items: [] }
 *     }
 *   }
 *
 * Sections, each the oldest or most urgent first, at most TODAY_ITEMS_MAX items
 * (`count` is the full number, which can be larger):
 *
 *   new_enquiries     enquiries still at status `new`. Moving an enquiry to
 *                     `contacted` is how the owner records a reply, so `new`
 *                     is "not yet replied". Oldest first.
 *   follow_ups_due    open enquiries (not won or lost) whose next-action date
 *                     is today or earlier. Earliest date first, then priority.
 *   calls             every call still `requested` (awaiting confirmation),
 *                     plus `confirmed` calls starting in the next 7 days.
 *                     Earliest start first.
 *   overdue_tasks     tasks not `done` whose due date is before today, on a
 *                     project that is not deleted. Earliest due first.
 *   waiting_material  project assets `requested` and unchanged for more than
 *                     3 days (a reopen counts as a fresh request), plus every
 *                     asset `supplied` and waiting for the owner to accept it.
 *   unpaid_invoices   invoices `sent` and past `due_at`: the same rule as the
 *                     `overdue` flag in invoices.php. Earliest due first.
 *
 * Each item: { type, id, title, reason, at, route }. `at` is a UTC ISO time
 * ("…Z") for a moment, or a plain date ("YYYY-MM-DD") for a due date. `route`
 * opens the record through the screen deep links in src/lib/deepLink.ts:
 * /app/leads?enquiry=, /app/leads?due=1&enquiry=, /app/leads?view=calls&call=,
 * /app/projects?project=&task=, /app/projects?project=&asset=,
 * /app/invoicing?invoice=.
 *
 * Dates use the database clock throughout, as invoices.php and bookings.php
 * do: CURRENT_DATE for due dates, NOW() for the TIMESTAMP columns, and
 * UTC_TIMESTAMP() for bookings.starts_at, which is stored in UTC.
 *
 * Failure: each section runs on its own. A missing table or column, or any
 * failed query, marks only that section `unavailable`, never an empty `ok`
 * with a zero, so an offline invoice source cannot read as "all on time".
 *
 * Roles: the endpoint admits the union of the roles of the endpoints it reads.
 * Each section then mirrors the role constant of the endpoint that owns its
 * data. A role that cannot read that endpoint gets no key for the section at
 * all (omitted, not `unavailable` and not empty), so an editor's response has
 * no `unpaid_invoices`. Keep TODAY_SECTIONS in step with those constants.
 */
require __DIR__ . '/_bootstrap.php';

const TODAY_ITEMS_MAX = 20;
const TODAY_ASSET_WAIT_DAYS = 3;
const TODAY_CALL_AHEAD_DAYS = 7;
const TODAY_LEADS_ROLES = ['super_admin', 'admin', 'manager', 'editor'];              // leads.php STAFF
const TODAY_BOOKINGS_ROLES = ['super_admin', 'admin', 'manager', 'editor'];           // bookings.php STAFF
const TODAY_TASKS_ROLES = ['super_admin', 'admin', 'manager', 'editor', 'employee'];  // tasks.php STAFF
const TODAY_ASSETS_ROLES = ['super_admin', 'admin', 'manager', 'editor', 'employee']; // assets.php STAFF
const TODAY_INVOICES_ROLES = ['super_admin', 'admin', 'manager'];                     // invoices.php STAFF
const TODAY_SECTIONS = [
  'new_enquiries'    => TODAY_LEADS_ROLES,
  'follow_ups_due'   => TODAY_LEADS_ROLES,
  'calls'            => TODAY_BOOKINGS_ROLES,
  'overdue_tasks'    => TODAY_TASKS_ROLES,
  'waiting_material' => TODAY_ASSETS_ROLES,
  'unpaid_invoices'  => TODAY_INVOICES_ROLES,
];

/** Every row of a parameterless prepared query. Throws on any failure. */
function td_rows(mysqli $conn, string $sql): array {
  $s = $conn->prepare($sql);
  if ($s === false) throw new RuntimeException('prepare failed: ' . $conn->errno);
  if (!$s->execute()) throw new RuntimeException('execute failed: ' . $s->errno);
  $res = $s->get_result();
  if ($res === false) throw new RuntimeException('no result: ' . $s->errno);
  return $res->fetch_all(MYSQLI_ASSOC);
}

/** The single number from a COUNT(*) query. Throws on any failure. */
function td_count(mysqli $conn, string $where): int {
  $rows = td_rows($conn, 'SELECT COUNT(*) AS n ' . $where);
  return (int)($rows[0]['n'] ?? 0);
}

/** A UTC ISO time from a Unix timestamp the database produced. */
function td_utc($unix): ?string {
  return $unix === null ? null : gmdate('Y-m-d\TH:i:s\Z', (int)$unix);
}

function td_item(string $type, $id, string $title, string $reason, ?string $at, string $route): array {
  return ['type' => $type, 'id' => (int)$id, 'title' => $title, 'reason' => $reason, 'at' => $at, 'route' => $route];
}

/** "Name, Company" or whichever of the two is present. */
function td_who(?string $name, ?string $company): string {
  $parts = array_values(array_filter([trim((string)$name), trim((string)$company)], fn($v) => $v !== ''));
  return $parts ? implode(', ', $parts) : 'Unnamed';
}

/** One section: ['count' => int, 'items' => array]. Each may throw. */
function td_section(mysqli $conn, string $key): array {
  $limit = ' LIMIT ' . TODAY_ITEMS_MAX;
  switch ($key) {
    case 'new_enquiries': {
      $where = " FROM enquiries WHERE deleted_at IS NULL AND status = 'new'";
      $rows = td_rows($conn, 'SELECT id, name, company, UNIX_TIMESTAMP(created_at) AS at_ts' . $where . ' ORDER BY created_at ASC, id ASC' . $limit);
      $items = array_map(fn($r) => td_item('enquiry', $r['id'], td_who($r['name'], $r['company']),
        'New enquiry, not replied to yet', td_utc($r['at_ts']), '/app/leads?enquiry=' . (int)$r['id']), $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
    case 'follow_ups_due': {
      // Fails with 1054 before the 2026-10-10 follow-up columns exist: unavailable.
      $where = " FROM enquiries WHERE deleted_at IS NULL AND status NOT IN ('won', 'lost')
        AND next_action_at IS NOT NULL AND next_action_at <= CURRENT_DATE";
      $rows = td_rows($conn, 'SELECT id, name, company, next_action_note, DATE_FORMAT(next_action_at, \'%Y-%m-%d\') AS due,
        (next_action_at < CURRENT_DATE) AS late' . $where . ' ORDER BY next_action_at ASC, priority DESC, id ASC' . $limit);
      $items = array_map(function ($r) {
        $reason = (int)$r['late'] === 1 ? 'Follow-up overdue' : 'Follow-up due today';
        $note = trim((string)($r['next_action_note'] ?? ''));
        if ($note !== '') $reason .= ': ' . $note;
        return td_item('enquiry', $r['id'], td_who($r['name'], $r['company']), $reason, $r['due'], '/app/leads?due=1&enquiry=' . (int)$r['id']);
      }, $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
    case 'calls': {
      // The same joins as bookings.php: a call whose enquiry or client was
      // deleted is still listed, without the deleted party's name.
      $where = " FROM bookings b
        LEFT JOIN enquiries e ON e.id = b.enquiry_id AND e.deleted_at IS NULL
        LEFT JOIN clients c ON c.id = b.client_id AND c.deleted_at IS NULL
        WHERE b.deleted_at IS NULL AND (b.status = 'requested' OR (b.status = 'confirmed'
          AND b.starts_at >= UTC_TIMESTAMP() AND b.starts_at < UTC_TIMESTAMP() + INTERVAL " . TODAY_CALL_AHEAD_DAYS . ' DAY))';
      $rows = td_rows($conn, 'SELECT b.id, b.status, DATE_FORMAT(b.starts_at, \'%Y-%m-%dT%H:%i:%sZ\') AS starts,
        e.name AS e_name, e.company AS e_company, c.company AS c_company' . $where . ' ORDER BY b.starts_at ASC, b.id ASC' . $limit);
      $items = array_map(function ($r) {
        $title = $r['c_company'] !== null && $r['c_company'] !== ''
          ? $r['c_company']
          : ($r['e_name'] !== null || $r['e_company'] !== null ? td_who($r['e_name'], $r['e_company']) : 'Call');
        $reason = $r['status'] === 'requested' ? 'Call requested, waiting for you to confirm' : 'Confirmed call';
        return td_item('booking', $r['id'], $title, $reason, $r['starts'], '/app/leads?view=calls&call=' . (int)$r['id']);
      }, $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
    case 'overdue_tasks': {
      $where = " FROM tasks t JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
        WHERE t.deleted_at IS NULL AND t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE";
      $rows = td_rows($conn, 'SELECT t.id, t.project_id, t.title, p.name AS project, DATE_FORMAT(t.due_date, \'%Y-%m-%d\') AS due'
        . $where . ' ORDER BY t.due_date ASC, t.id ASC' . $limit);
      $items = array_map(fn($r) => td_item('task', $r['id'], $r['title'], 'Overdue task on ' . $r['project'],
        $r['due'], '/app/projects?project=' . (int)$r['project_id'] . '&task=' . (int)$r['id']), $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
    case 'waiting_material': {
      // A requested item's clock is updated_at: the request, or its last reopen.
      $where = " FROM project_assets a JOIN projects p ON p.id = a.project_id AND p.deleted_at IS NULL
        WHERE a.deleted_at IS NULL AND ((a.status = 'requested' AND a.updated_at < NOW() - INTERVAL " . TODAY_ASSET_WAIT_DAYS . " DAY)
          OR a.status = 'supplied')";
      $rows = td_rows($conn, "SELECT a.id, a.project_id, a.label, a.status, p.name AS project,
        UNIX_TIMESTAMP(CASE WHEN a.status = 'supplied' THEN COALESCE(a.supplied_at, a.updated_at) ELSE a.updated_at END) AS at_ts"
        . $where . ' ORDER BY at_ts ASC, a.id ASC' . $limit);
      $items = array_map(fn($r) => td_item('asset', $r['id'], $r['label'],
        ($r['status'] === 'supplied' ? 'Supplied by the client, waiting for you to accept, on ' : 'Requested from the client over '
          . TODAY_ASSET_WAIT_DAYS . ' days ago, on ') . $r['project'],
        td_utc($r['at_ts']), '/app/projects?project=' . (int)$r['project_id'] . '&asset=' . (int)$r['id']), $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
    case 'unpaid_invoices': {
      $where = " FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.deleted_at IS NULL AND i.status = 'sent' AND i.due_at IS NOT NULL AND i.due_at < CURRENT_DATE";
      $rows = td_rows($conn, 'SELECT i.id, i.number, c.company, DATE_FORMAT(i.due_at, \'%Y-%m-%d\') AS due'
        . $where . ' ORDER BY i.due_at ASC, i.id ASC' . $limit);
      $items = array_map(function ($r) {
        $title = ($r['number'] ?: 'Invoice #' . $r['id']) . ($r['company'] ? ', ' . $r['company'] : '');
        return td_item('invoice', $r['id'], $title, 'Sent and past its due date, not paid', $r['due'], '/app/invoicing?invoice=' . (int)$r['id']);
      }, $rows);
      return ['count' => td_count($conn, $where), 'items' => $items];
    }
  }
  throw new RuntimeException('unknown section');
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') fail('Method not allowed.', 405);

$allRoles = array_values(array_unique(array_merge(...array_values(TODAY_SECTIONS))));
$user = require_auth($conn, $allRoles); // staff only; a client or trainer gets 403

$sections = [];
foreach (TODAY_SECTIONS as $key => $roles) {
  if (!in_array($user['role'], $roles, true)) continue; // omitted: this role cannot read the source
  try {
    $s = td_section($conn, $key);
    $sections[$key] = ['status' => 'ok', 'count' => $s['count'], 'items' => $s['items']];
  } catch (Throwable $e) {
    error_log('today.php ' . $key . ' unavailable: ' . $e->getMessage());
    $sections[$key] = ['status' => 'unavailable', 'count' => null, 'items' => []];
  }
}

try {
  $now = td_rows($conn, 'SELECT UNIX_TIMESTAMP() AS t')[0]['t'] ?? null;
} catch (Throwable $e) {
  $now = null;
}
ok(['generated_at' => td_utc($now ?? time()), 'sections' => (object)$sections]);
