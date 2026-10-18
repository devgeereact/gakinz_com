<?php
/**
 * Project asset checklist (docs/PRODUCT-SPEC.md sections 6.2 and 7).
 * What a client must send for a project, and where each item stands.
 *
 * Staff (the roles of projects.php):
 *   GET  /assets.php?project_id=N       → the project's items, oldest first
 *   POST /assets.php?action=create      {project_id, label, note?}
 *   POST /assets.php?action=update      {id, label?, note?, file_id?}   file_id null clears it
 *   POST /assets.php?action=accept      {id}   requested or supplied → accepted
 *   POST /assets.php?action=reopen      {id}   supplied or accepted → requested
 *   POST /assets.php?action=delete      {id}   soft delete
 *
 * Client (role `client` only):
 *   GET  /assets.php?action=mine        → the items on the client's own projects
 *   POST /assets.php?action=supply      {id, note?}   requested → supplied
 *
 * Isolation: the client comes from the token and nothing else. Every client
 * query joins the item to a live project whose client_id is that client, so
 * an item of another client's project answers 404, exactly as a missing one
 * does. A client can only supply: label, note, status, file and acceptance are
 * staff only, and any other field in a supply body is ignored. `requested_by`
 * and `file_id` are never returned to a client.
 *
 * Uploads: files.php accepts staff uploads only, so a client supplies with a
 * note (and sends the file by Messages or email). Staff may link an item to a
 * file already stored against the same project.
 *
 * Reopen returns an item to requested and clears supplied_at and accepted_at.
 * client_note is kept, so what the client said last time stays visible; a new
 * supply with a note replaces it, and a supply without one keeps it.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee']; // as projects.php
const ASSET_LABEL_MAX = 160;
const ASSET_NOTE_MAX = 1000;
const ASSETS_PER_PROJECT_MAX = 100;
const ASSETS_MIGRATION = 'The asset checklist needs the 2026-10-18 database update (SQL 15) first.';
const ASSET_STAFF_COLS = 'a.id, a.project_id, a.label, a.note, a.status, a.client_note, a.file_id, a.supplied_at, a.accepted_at,
  a.created_at, a.updated_at, f.name AS file_name, u.name AS requested_by_name';
const ASSET_STAFF_FROM = ' FROM project_assets a
  LEFT JOIN files f ON f.id = a.file_id AND f.deleted_at IS NULL
  LEFT JOIN users u ON u.id = a.requested_by';
// Client reads: always scoped through the project to the token's client.
const ASSET_CLIENT_SQL = 'SELECT a.id, a.project_id, p.name AS project_name, a.label, a.note, a.status, a.client_note,
  a.supplied_at, a.accepted_at, a.created_at, a.updated_at
  FROM project_assets a JOIN projects p ON p.id = a.project_id AND p.deleted_at IS NULL AND p.client_id = ?
  WHERE a.deleted_at IS NULL';

function as_stmt(mysqli $conn, string $sql): mysqli_stmt {
  $s = $conn->prepare($sql);
  if ($s === false) {
    if ($conn->errno === 1146) fail(ASSETS_MIGRATION, 503);
    fail('Database error.', 500);
  }
  return $s;
}

function as_id($v): int {
  if (is_int($v)) return $v > 0 ? $v : 0;
  if (is_string($v) && preg_match('/^[1-9]\d{0,9}$/', $v)) return (int)$v;
  return 0;
}

/** A required, trimmed label of 1 to ASSET_LABEL_MAX characters. */
function as_label($v): string {
  if (!is_string($v)) fail('A label is required.');
  $v = trim(preg_replace('/[\r\n]+/', ' ', $v));
  if ($v === '') fail('A label is required.');
  if (mb_strlen($v) > ASSET_LABEL_MAX) fail('Keep the label under ' . ASSET_LABEL_MAX . ' characters.');
  return $v;
}

/** An optional note: null when absent or blank, refused when too long. */
function as_note(array $in, string $key): ?string {
  if (!array_key_exists($key, $in) || $in[$key] === null) return null;
  if (!is_string($in[$key])) fail("Invalid $key.");
  $v = trim($in[$key]);
  if ($v === '') return null;
  if (mb_strlen($v) > ASSET_NOTE_MAX) fail('Keep the note under ' . ASSET_NOTE_MAX . ' characters.');
  return $v;
}

function as_staff_shape(array $r): array {
  return [
    'id'           => (int)$r['id'],
    'project_id'   => (int)$r['project_id'],
    'label'        => $r['label'],
    'note'         => $r['note'],
    'status'       => $r['status'],
    'client_note'  => $r['client_note'],
    'file_id'      => $r['file_id'] !== null && $r['file_name'] !== null ? (int)$r['file_id'] : null,
    'file_name'    => $r['file_name'],
    'requested_by' => $r['requested_by_name'],
    'supplied_at'  => $r['supplied_at'],
    'accepted_at'  => $r['accepted_at'],
    'created_at'   => $r['created_at'],
    'updated_at'   => $r['updated_at'],
  ];
}

/** The fields a client may read about an item on one of their own projects. */
function as_client_shape(array $r): array {
  return [
    'id'           => (int)$r['id'],
    'project_id'   => (int)$r['project_id'],
    'project_name' => $r['project_name'],
    'label'        => $r['label'],
    'note'         => $r['note'],
    'status'       => $r['status'],
    'client_note'  => $r['client_note'],
    'supplied_at'  => $r['supplied_at'],
    'accepted_at'  => $r['accepted_at'],
    'created_at'   => $r['created_at'],
    'updated_at'   => $r['updated_at'],
  ];
}

/** One live item for staff, or 404. */
function as_staff_item(mysqli $conn, int $id): array {
  $s = as_stmt($conn, 'SELECT ' . ASSET_STAFF_COLS . ASSET_STAFF_FROM . '
    JOIN projects p ON p.id = a.project_id AND p.deleted_at IS NULL
    WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1');
  $s->bind_param('i', $id);
  $s->execute();
  $r = $s->get_result()->fetch_assoc();
  if (!$r) fail('Item not found.', 404);
  return $r;
}

/** The id from a staff action body, or 400. */
function as_body_id(array $in): int {
  $id = as_id($in['id'] ?? null);
  if ($id <= 0) fail('An item id is required.');
  return $id;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
  // ── Client branch ───────────────────────────────────────────────────────────
  // Only these two routes accept a client, and they accept nobody else. Both
  // always end the request, so a client never reaches the staff code below.
  if (($method === 'GET' && $action === 'mine') || ($method === 'POST' && $action === 'supply')) {
    $user = require_auth($conn, ['client']);
    $clientId = (int)($user['client_id'] ?? 0);
    if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
    $c = as_stmt($conn, 'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $c->bind_param('i', $clientId);
    $c->execute();
    if (!$c->get_result()->fetch_assoc()) fail('Client not found.', 404);

    if ($method === 'GET') {
      $s = as_stmt($conn, ASSET_CLIENT_SQL . ' ORDER BY a.project_id DESC, a.id ASC LIMIT 500');
      $s->bind_param('i', $clientId);
      $s->execute();
      ok(array_map('as_client_shape', $s->get_result()->fetch_all(MYSQLI_ASSOC)));
    }

    // Supply. Only `id` and `note` are read from the body.
    $in = body();
    $id = as_id($in['id'] ?? null);
    if ($id <= 0) fail('An item id is required.');
    $note = as_note($in, 'note');

    $s = as_stmt($conn, ASSET_CLIENT_SQL . ' AND a.id = ? LIMIT 1');
    $s->bind_param('ii', $clientId, $id);
    $s->execute();
    $item = $s->get_result()->fetch_assoc();
    if (!$item) fail('Item not found.', 404); // another client's item answers as a missing one
    if ($item['status'] !== 'requested') {
      fail($item['status'] === 'accepted' ? 'The studio has already accepted this item.' : 'You have already marked this item as sent.', 409);
    }

    // Atomic claim: only a requested item on a live project of this client moves.
    $u = as_stmt($conn, "UPDATE project_assets a JOIN projects p ON p.id = a.project_id AND p.deleted_at IS NULL AND p.client_id = ?
      SET a.status = 'supplied', a.supplied_at = NOW(), a.client_note = COALESCE(?, a.client_note)
      WHERE a.id = ? AND a.deleted_at IS NULL AND a.status = 'requested'");
    $u->bind_param('isi', $clientId, $note, $id);
    $u->execute();
    if ($u->affected_rows < 1) fail('You have already marked this item as sent.', 409);
    audit($conn, $user['id'], 'asset_supply', "#$id (client) project #" . (int)$item['project_id'] . ($note !== null ? ' with note' : ''));

    $s = as_stmt($conn, ASSET_CLIENT_SQL . ' AND a.id = ? LIMIT 1');
    $s->bind_param('ii', $clientId, $id);
    $s->execute();
    ok(as_client_shape($s->get_result()->fetch_assoc()));
  }

  // ── Staff ───────────────────────────────────────────────────────────────────
  if ($method === 'GET') {
    require_auth($conn, STAFF); // a client gets 403 here
    $pid = as_id($_GET['project_id'] ?? null);
    if ($pid <= 0) fail('A project id is required.');
    $p = as_stmt($conn, 'SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $p->bind_param('i', $pid);
    $p->execute();
    if (!$p->get_result()->fetch_assoc()) fail('Project not found.', 404);
    $s = as_stmt($conn, 'SELECT ' . ASSET_STAFF_COLS . ASSET_STAFF_FROM . ' WHERE a.project_id = ? AND a.deleted_at IS NULL ORDER BY a.id ASC LIMIT 500');
    $s->bind_param('i', $pid);
    $s->execute();
    ok(array_map('as_staff_shape', $s->get_result()->fetch_all(MYSQLI_ASSOC)));
  }

  if ($method !== 'POST') fail('Method not allowed.', 405);
  $user = require_auth($conn, STAFF); // a client gets 403 on every action below
  if (!in_array($action, ['create', 'update', 'accept', 'reopen', 'delete'], true)) fail('Unknown action.');
  $in = body();

  if ($action === 'create') {
    $pid = as_id($in['project_id'] ?? null);
    if ($pid <= 0) fail('A project id is required.');
    $label = as_label($in['label'] ?? null);
    $note = as_note($in, 'note');
    $p = as_stmt($conn, 'SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $p->bind_param('i', $pid);
    $p->execute();
    if (!$p->get_result()->fetch_assoc()) fail('Project not found.', 404);
    $n = as_stmt($conn, 'SELECT COUNT(*) AS n FROM project_assets WHERE project_id = ? AND deleted_at IS NULL');
    $n->bind_param('i', $pid);
    $n->execute();
    if ((int)$n->get_result()->fetch_assoc()['n'] >= ASSETS_PER_PROJECT_MAX) {
      fail('A project can list up to ' . ASSETS_PER_PROJECT_MAX . ' items.', 409);
    }
    $uid = $user['id'];
    $s = as_stmt($conn, 'INSERT INTO project_assets (project_id, label, note, requested_by) VALUES (?, ?, ?, ?)');
    $s->bind_param('issi', $pid, $label, $note, $uid);
    $s->execute();
    $id = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'asset_create', "#$id project #$pid");
    ok(as_staff_shape(as_staff_item($conn, $id)), 201);
  }

  $id = as_body_id($in);
  $item = as_staff_item($conn, $id);

  if ($action === 'update') {
    $label = array_key_exists('label', $in) ? as_label($in['label']) : $item['label'];
    $note = array_key_exists('note', $in) ? as_note($in, 'note') : $item['note'];
    $fileId = $item['file_name'] !== null ? (int)$item['file_id'] : null;
    if (array_key_exists('file_id', $in)) {
      if ($in['file_id'] === null) {
        $fileId = null;
      } else {
        $fileId = as_id($in['file_id']);
        if ($fileId <= 0) fail('Invalid file id.');
        // Only a live file stored against this same project may be linked.
        $f = as_stmt($conn, 'SELECT id FROM files WHERE id = ? AND project_id = ? AND deleted_at IS NULL LIMIT 1');
        $pid = (int)$item['project_id'];
        $f->bind_param('ii', $fileId, $pid);
        $f->execute();
        if (!$f->get_result()->fetch_assoc()) fail('That file is not stored against this project.', 404);
      }
    }
    $s = as_stmt($conn, 'UPDATE project_assets SET label = ?, note = ?, file_id = ? WHERE id = ? AND deleted_at IS NULL');
    $s->bind_param('ssii', $label, $note, $fileId, $id);
    $s->execute();
    audit($conn, $user['id'], 'asset_update', "#$id");
    ok(as_staff_shape(as_staff_item($conn, $id)));
  }

  if ($action === 'accept') {
    if ($item['status'] === 'accepted') fail('This item is already accepted.', 409);
    $s = as_stmt($conn, "UPDATE project_assets SET status = 'accepted', accepted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL AND status IN ('requested', 'supplied')");
    $s->bind_param('i', $id);
    $s->execute();
    if ($s->affected_rows < 1) fail('This item is already accepted.', 409);
    audit($conn, $user['id'], 'asset_accept', "#$id from {$item['status']}");
    ok(as_staff_shape(as_staff_item($conn, $id)));
  }

  if ($action === 'reopen') {
    if ($item['status'] === 'requested') fail('This item is already waiting for the client.', 409);
    // client_note is kept on purpose: what the client said stays on the record.
    $s = as_stmt($conn, "UPDATE project_assets SET status = 'requested', supplied_at = NULL, accepted_at = NULL
      WHERE id = ? AND deleted_at IS NULL AND status IN ('supplied', 'accepted')");
    $s->bind_param('i', $id);
    $s->execute();
    if ($s->affected_rows < 1) fail('This item is already waiting for the client.', 409);
    audit($conn, $user['id'], 'asset_reopen', "#$id from {$item['status']}");
    ok(as_staff_shape(as_staff_item($conn, $id)));
  }

  if ($action === 'delete') {
    $s = as_stmt($conn, 'UPDATE project_assets SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
    $s->bind_param('i', $id);
    $s->execute();
    if ($s->affected_rows < 1) fail('Item not found.', 404);
    audit($conn, $user['id'], 'asset_delete', "#$id project #" . (int)$item['project_id']);
    ok(['ok' => true]);
  }
} catch (mysqli_sql_exception $e) {
  if ($e->getCode() === 1146) fail(ASSETS_MIGRATION, 503); // ER_NO_SUCH_TABLE: SQL 15 has not run
  throw $e;
}

fail('Method not allowed.', 405);
