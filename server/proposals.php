<?php
/**
 * Proposals & quotes (GAkinzOS §6 Proposals). Protected.
 *
 *   GET  /proposals.php              → list (with client + computed total)
 *   GET  /proposals.php?id=N         → one proposal with its line items
 *   POST /proposals.php?action=create {client_id?, title, valid_until?, notes?, items:[{description,qty,unit_price}]}
 *   POST /proposals.php?action=status {id, status}    status: sent | declined | draft
 *   POST /proposals.php?action=accept {id, method, reference, received_on}
 *                                                     → record the client's acceptance + create a project.
 *                                                       Evidence is required once SQL 14 has run.
 *   POST /proposals.php?action=share {id}             → issue or reuse the public link token
 *   POST /proposals.php?action=unshare {id}           → revoke the public link
 *   GET  /proposals.php?token=T                       → public view; 410 once declined or expired
 *
 * Status: draft | sent | accepted | declined
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];

// How the client's acceptance reached us (SQL 14). Staff clicking Accept is not
// proof the client agreed, so accept records what the client sent.
const ACCEPTANCE_METHODS = ['email', 'letter', 'in_person', 'phone', 'other'];

/**
 * True once SQL 14 (acceptance evidence) has run. Before that, accept behaves
 * exactly as it did and asks for no evidence. Cached per request.
 */
function acceptance_cols_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows; it only proves the columns are there.
    $res = $conn->query('SELECT accepted_at, accepted_by, acceptance_method, acceptance_reference,
                                acceptance_received_on, accepted_terms_sha256 FROM proposals LIMIT 0');
    $ready = $res !== false; // older mysqli reporting returns false instead of throwing
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    $ready = false;
  }
  return $ready;
}

/** The evidence columns for a SELECT on alias `p`, or NULL placeholders before SQL 14. */
function acceptance_cols_sql(mysqli $conn): string {
  return acceptance_cols_ready($conn)
    ? 'p.accepted_at, p.accepted_by, p.acceptance_method, p.acceptance_reference, p.acceptance_received_on,
       p.accepted_terms_sha256, u.name AS accepted_by_name'
    : 'NULL AS accepted_at, NULL AS accepted_by, NULL AS acceptance_method, NULL AS acceptance_reference,
       NULL AS acceptance_received_on, NULL AS accepted_terms_sha256, NULL AS accepted_by_name';
}

/** The join that names the recorder, or nothing before SQL 14. */
function acceptance_join_sql(mysqli $conn): string {
  return acceptance_cols_ready($conn) ? ' LEFT JOIN users u ON u.id = p.accepted_by' : '';
}

/** Cast the evidence columns of a row in place and say whether SQL 14 has run. */
function acceptance_cols_cast(mysqli $conn, array &$r): void {
  $r['accepted_by'] = $r['accepted_by'] !== null ? (int)$r['accepted_by'] : null;
  $r['evidence_ready'] = acceptance_cols_ready($conn);
}

/** Money as a fixed two-decimal string, so the hash never depends on float printing. */
function terms_money(float $amount): string {
  return sprintf('%.2f', round($amount, 2));
}

/**
 * The 40 / 30 / 30 schedule accept creates: deposit due on acceptance, stage
 * +30 days, final +60 days. The final part absorbs rounding so the parts sum
 * to the whole. Used both to create the invoices and in the terms hash, so the
 * fingerprint covers exactly the schedule that was created.
 */
function acceptance_plan(float $subtotal): array {
  $deposit = round($subtotal * 0.40, 2);
  $stage   = round($subtotal * 0.30, 2);
  $final   = round($subtotal - $deposit - $stage, 2);
  return [
    ['label' => 'Deposit (40%)',       'percent' => 40, 'amount' => $deposit, 'days' => 0],
    ['label' => 'Stage payment (30%)', 'percent' => 30, 'amount' => $stage,   'days' => 30],
    ['label' => 'Final payment (30%)', 'percent' => 30, 'amount' => $final,   'days' => 60],
  ];
}

/**
 * The exact terms the client accepts, as canonical JSON. Version 1 shape, keys
 * always in this order, every number a fixed string:
 *
 *   {
 *     "v": 1,
 *     "title": "Booking site",
 *     "currency": "GBP",
 *     "vat_rate": "20.00",                       percent, 2dp
 *     "valid_until": "2026-12-31" | null,
 *     "items": [                                 in line order (proposal_items.id)
 *       { "description": "Build", "qty": "1.00", "unit_price": "1000.00", "amount": "1000.00" }
 *     ],
 *     "subtotal": "1000.00",                     ex VAT, round(sum(qty * unit_price), 2)
 *     "vat": "200.00",                           round(subtotal * vat_rate / 100, 2), as _money.php
 *     "total": "1200.00",
 *     "payment_schedule": [                      acceptance_plan(), ex VAT
 *       { "label": "Deposit (40%)", "percent": "40", "amount": "400.00", "due_days_after_acceptance": "0" },
 *       ...
 *     ],
 *     "notes": "Scope text" | ""                 the scope the public link shows
 *   }
 *
 * Encoded with JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES. The proposal
 * id, status, client and dates of sending or viewing are left out on purpose:
 * two quotes with identical terms have the same fingerprint, and any change to
 * a line, price, VAT, currency, validity, schedule or scope changes it.
 * Changing this shape changes every future hash, so bump "v" if you do.
 */
function proposal_terms(array $p, array $items, float $subtotal): array {
  $vatRate = (float)$p['vat_rate'];
  $sub = round($subtotal, 2);
  $vat = round($sub * $vatRate / 100, 2);
  $lines = [];
  foreach ($items as $it) {
    $qty = (float)$it['qty'];
    $unit = (float)$it['unit_price'];
    $lines[] = [
      'description' => (string)$it['description'],
      'qty'         => terms_money($qty),
      'unit_price'  => terms_money($unit),
      'amount'      => terms_money($qty * $unit),
    ];
  }
  $schedule = [];
  foreach (acceptance_plan($subtotal) as $part) {
    $schedule[] = [
      'label'                     => $part['label'],
      'percent'                   => (string)$part['percent'],
      'amount'                    => terms_money($part['amount']),
      'due_days_after_acceptance' => (string)$part['days'],
    ];
  }
  return [
    'v'                => 1,
    'title'            => (string)$p['title'],
    'currency'         => (string)($p['currency'] ?: 'GBP'),
    'vat_rate'         => terms_money($vatRate),
    'valid_until'      => $p['valid_until'] !== null && $p['valid_until'] !== '' ? (string)$p['valid_until'] : null,
    'items'            => $lines,
    'subtotal'         => terms_money($sub),
    'vat'              => terms_money($vat),
    'total'            => terms_money($sub + $vat),
    'payment_schedule' => $schedule,
    'notes'            => (string)($p['notes'] ?? ''),
  ];
}

function proposal_terms_sha256(array $terms): string {
  return hash('sha256', json_encode($terms, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Public read-only view by share token (no auth). Records a view. ──────────
if ($method === 'GET' && isset($_GET['token'])) {
  $token = preg_replace('/[^a-f0-9]/', '', (string)$_GET['token']);
  if ($token === '') fail('Invalid link.', 404);
  // The client sees only the day their acceptance was received, never the
  // reference, the method or who recorded it.
  $acceptedOn = acceptance_cols_ready($conn) ? 'p.acceptance_received_on' : 'NULL';
  $stmt = $conn->prepare(
    'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.notes, p.valid_until,
            c.company AS client_company, ' . $acceptedOn . ' AS accepted_on
     FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.share_token = ? AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('This proposal link is invalid or has expired.', 404);
  // A declined proposal, or one past its valid-until date that was never
  // accepted, is no longer an offer, so its link stops working (K-060). An
  // accepted proposal stays readable as the record of what was agreed.
  if ($p['status'] === 'declined') fail('This proposal is no longer available.', 410);
  if ($p['status'] !== 'accepted' && !empty($p['valid_until']) && $p['valid_until'] < date('Y-m-d')) {
    fail('This proposal has expired. Ask for an updated one.', 410);
  }
  $p['id'] = (int)$p['id'];
  $p['vat_rate'] = (float)$p['vat_rate'];
  if ($p['status'] !== 'accepted') $p['accepted_on'] = null;

  $items = [];
  $stmt = $conn->prepare('SELECT description, qty, unit_price FROM proposal_items WHERE proposal_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $p['id']);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $items[] = $r;
  }
  $p['items'] = $items;

  // Record the view (best-effort).
  $upd = $conn->prepare('UPDATE proposals SET views = views + 1, last_viewed_at = NOW() WHERE id = ?');
  $upd->bind_param('i', $p['id']);
  $upd->execute();

  ok($p);
}

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.notes, p.valid_until, p.client_id, p.project_id,
            c.company AS client_company, p.created_at, ' . acceptance_cols_sql($conn) . '
     FROM proposals p LEFT JOIN clients c ON c.id = p.client_id' . acceptance_join_sql($conn) . '
     WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  $p['id'] = (int)$p['id'];
  $p['vat_rate'] = (float)$p['vat_rate'];
  acceptance_cols_cast($conn, $p);

  $items = [];
  $stmt = $conn->prepare('SELECT id, description, qty, unit_price FROM proposal_items WHERE proposal_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $items[] = $r;
  }
  $p['items'] = $items;
  ok($p);
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $rows = [];
  $sql = 'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.share_token, p.views, p.last_viewed_at,
                 p.valid_until, p.client_id, p.project_id,
                 c.company AS client_company, p.created_at, ' . acceptance_cols_sql($conn) . ',
                 (SELECT COALESCE(SUM(qty * unit_price), 0) FROM proposal_items i WHERE i.proposal_id = p.id) AS total
          FROM proposals p LEFT JOIN clients c ON c.id = p.client_id' . acceptance_join_sql($conn) . '
          WHERE p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
      $r['vat_rate'] = (float)$r['vat_rate'];
      $r['views'] = (int)($r['views'] ?? 0);
      $r['total'] = (float)$r['total'];
      acceptance_cols_cast($conn, $r);
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $notes = str_field($in, 'notes', 5000);
  $valid = str_field($in, 'valid_until', 10);
  $valid = $valid !== '' ? $valid : null;
  $vat = isset($in['vat_rate']) ? max(0, min(100, (float)$in['vat_rate'])) : 0;
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (count($items) === 0) fail('Add at least one line item.');

  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO proposals (client_id, title, notes, vat_rate, valid_until) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('issds', $clientId, $title, $notes, $vat, $valid);
    $stmt->execute();
    $pid = $conn->insert_id;

    $stmt = $conn->prepare('INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (?, ?, ?, ?)');
    foreach ($items as $it) {
      $desc = mb_substr(trim((string)($it['description'] ?? '')), 0, 300);
      if ($desc === '') continue;
      $qty = (float)($it['qty'] ?? 1);
      $price = (float)($it['unit_price'] ?? 0);
      $stmt->bind_param('isdd', $pid, $desc, $qty, $price);
      $stmt->execute();
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not create the proposal.', 500);
  }
  audit($conn, $user['id'], 'proposal_create', $title);
  ok(['id' => $pid], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A proposal id is required.');
  if (!in_array($status, ['draft', 'sent', 'declined'], true)) fail('Invalid status.');
  $stmt = $conn->prepare('SELECT status FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $cur = $stmt->get_result()->fetch_assoc();
  if (!$cur) fail('Proposal not found.', 404);
  // An accepted quote has a project and invoices behind it; its terms are fixed.
  if ($cur['status'] === 'accepted') fail('This quote has been accepted. Create a new quote for changed terms.', 409);
  $stmt = $conn->prepare('UPDATE proposals SET status = ? WHERE id = ? AND deleted_at IS NULL AND status <> "accepted"');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($conn, $user['id'], 'proposal_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'accept') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');

  $stmt = $conn->prepare('SELECT title, client_id, project_id, status, currency, vat_rate, notes, valid_until,
                                 valid_until < CURRENT_DATE AS expired, DATE(created_at) AS created_on, CURRENT_DATE AS today
                          FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  if ($p['project_id']) ok(['ok' => true, 'project_id' => (int)$p['project_id'], 'existing' => true]);
  // Only a quote the client has actually been sent can be accepted (K-028).
  if ($p['status'] !== 'sent') fail('Only a sent quote can be accepted. Mark it as sent first.', 409);
  if (!empty($p['expired'])) fail('This quote expired on ' . $p['valid_until'] . '. Extend its validity before accepting.', 409);

  // Acceptance evidence (SQL 14). Checked before any write, so a refused
  // request creates no project and no invoice. Before SQL 14 runs, accept asks
  // for nothing and behaves exactly as it always has.
  $evidence = acceptance_cols_ready($conn);
  if ($evidence) {
    $how = is_string($in['method'] ?? null) ? trim($in['method']) : '';
    if (!in_array($how, ACCEPTANCE_METHODS, true)) {
      fail('Say how the client accepted: email, letter, in person, phone or other.');
    }
    $reference = is_scalar($in['reference'] ?? null) ? trim((string)$in['reference']) : '';
    $refLen = mb_strlen($reference);
    if ($refLen < 3 || $refLen > 200) {
      fail('Give a reference for the acceptance of 3 to 200 characters, for example the email subject and sender.');
    }
    $receivedOn = is_string($in['received_on'] ?? null) ? trim($in['received_on']) : '';
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $receivedOn) ? DateTime::createFromFormat('!Y-m-d', $receivedOn) : false;
    if (!$date || $date->format('Y-m-d') !== $receivedOn) fail('Enter the date the acceptance was received as YYYY-MM-DD.');
    // The database clock, the same one that sets created_at and judges expiry.
    if ($receivedOn > (string)$p['today']) fail('The date the acceptance was received cannot be in the future.');
    // There is no sent date on a quote, so the earliest a client could have
    // accepted is the day the quote was created.
    $createdOn = (string)($p['created_on'] ?? '');
    if ($createdOn !== '' && $receivedOn < $createdOn) {
      fail('The acceptance cannot have been received before the quote was created (' . $createdOn . ').');
    }
  }

  // The lines, in order. The subtotal (ex VAT) drives the 40/30/30 schedule.
  $items = [];
  $stmt = $conn->prepare('SELECT description, qty, unit_price FROM proposal_items WHERE proposal_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) $items[] = $r;
  $stmt = $conn->prepare('SELECT COALESCE(SUM(qty * unit_price), 0) AS subtotal FROM proposal_items WHERE proposal_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $subtotal = (float)$stmt->get_result()->fetch_assoc()['subtotal'];
  $vat = (float)$p['vat_rate'];
  $termsHash = proposal_terms_sha256(proposal_terms($p, $items, $subtotal));

  $conn->begin_transaction();
  try {
    // Claim the quote first. The guarded UPDATE takes the row lock, so a
    // concurrent request waits, then matches nothing and returns the project
    // this request created (K-028). Exactly one request converts, and only that
    // one writes the evidence and the terms fingerprint.
    if ($evidence) {
      $claim = $conn->prepare(
        'UPDATE proposals SET status = "accepted", accepted_at = NOW(), accepted_by = ?, acceptance_method = ?,
                acceptance_reference = ?, acceptance_received_on = ?, accepted_terms_sha256 = ?
         WHERE id = ? AND status = "sent" AND project_id IS NULL AND deleted_at IS NULL'
      );
      $claim->bind_param('issssi', $user['id'], $how, $reference, $receivedOn, $termsHash, $id);
    } else {
      $claim = $conn->prepare('UPDATE proposals SET status = "accepted" WHERE id = ? AND status = "sent" AND project_id IS NULL AND deleted_at IS NULL');
      $claim->bind_param('i', $id);
    }
    $claim->execute();
    if ($claim->affected_rows !== 1) {
      $conn->rollback();
      $stmt = $conn->prepare('SELECT project_id FROM proposals WHERE id = ? LIMIT 1');
      $stmt->bind_param('i', $id);
      $stmt->execute();
      $existing = (int)($stmt->get_result()->fetch_assoc()['project_id'] ?? 0);
      if ($existing > 0) ok(['ok' => true, 'project_id' => $existing, 'existing' => true]);
      fail('This quote is no longer open for acceptance.', 409);
    }

    $title = $p['title'];
    $clientId = $p['client_id'] !== null ? (int)$p['client_id'] : null;
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, status) VALUES (?, ?, "in_progress")');
    $stmt->bind_param('si', $title, $clientId);
    $stmt->execute();
    $projectId = $conn->insert_id;

    $stmt = $conn->prepare('UPDATE proposals SET project_id = ? WHERE id = ?');
    $stmt->bind_param('ii', $projectId, $id);
    $stmt->execute();

    // 40 / 30 / 30 payment schedule (acceptance_plan), the same one the terms
    // fingerprint covers.
    $today  = new DateTime();
    $issued = $today->format('Y-m-d');
    $schedule = [];

    $insInv  = $conn->prepare('INSERT INTO invoices (client_id, project_id, vat_rate, issued_at, due_at) VALUES (?, ?, ?, ?, ?)');
    $setNum  = $conn->prepare('UPDATE invoices SET number = ? WHERE id = ?');
    $insItem = $conn->prepare('INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (?, ?, 1, ?)');
    foreach (acceptance_plan($subtotal) as $part) {
      $due = (clone $today)->modify('+' . $part['days'] . ' days')->format('Y-m-d');
      $insInv->bind_param('iidss', $clientId, $projectId, $vat, $issued, $due);
      $insInv->execute();
      $iid = $conn->insert_id;
      $number = sprintf('GK-INV-%04d', $iid);
      $setNum->bind_param('si', $number, $iid);
      $setNum->execute();
      $desc = $part['label'] . ' — ' . $title;
      $amt  = $part['amount'];
      $insItem->bind_param('isd', $iid, $desc, $amt);
      $insItem->execute();
      $schedule[] = ['id' => $iid, 'number' => $number, 'label' => $part['label'], 'amount' => $amt, 'due_at' => $due];
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not accept the proposal.', 500);
  }
  // The reference can name a person, so the audit line carries the method,
  // date and fingerprint only; the reference stays on the proposal row.
  $detail = $evidence ? " ($how received $receivedOn, terms " . substr($termsHash, 0, 12) . ')' : ' (no evidence: SQL 14 not run)';
  audit($conn, $user['id'], 'proposal_accept', "#$id → project #$projectId + 3 invoices (40/30/30)" . $detail);
  ok([
    'ok' => true,
    'project_id' => $projectId,
    'invoices' => $schedule,
    'evidence_recorded' => $evidence,
    'accepted_terms_sha256' => $evidence ? $termsHash : null,
  ]);
}

// Issue (or reuse) a public share token for a read-only proposal link.
if ($method === 'POST' && $action === 'share') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');
  $stmt = $conn->prepare('SELECT share_token FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('Proposal not found.', 404);
  $token = $row['share_token'] ?: bin2hex(random_bytes(20));
  if (!$row['share_token']) {
    $upd = $conn->prepare('UPDATE proposals SET share_token = ? WHERE id = ?');
    $upd->bind_param('si', $token, $id);
    $upd->execute();
  }
  audit($conn, $user['id'], 'proposal_share', "#$id");
  ok(['token' => $token]);
}

// Revoke the public link. The next Share issues a new token, so an old copy of
// the link never works again (K-060).
if ($method === 'POST' && $action === 'unshare') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');
  $stmt = $conn->prepare('UPDATE proposals SET share_token = NULL WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $chk = $conn->prepare('SELECT id FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Proposal not found.', 404);
  }
  audit($conn, $user['id'], 'proposal_unshare', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
