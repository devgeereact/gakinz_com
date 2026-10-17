<?php
/**
 * User & role management (GAkinzOS §6.11 Platform). Admin only.
 *
 *   GET  /users.php                 → list users
 *   POST /users.php?action=create   {name, email, password, role}
 *   POST /users.php?action=role     {id, role}
 *   POST /users.php?action=status   {id, status}   status: active | suspended
 *
 * Roles come from VALID_ROLES. A user cannot change their own role or status
 * (prevents self-lockout / self-demotion).
 */
require __DIR__ . '/_bootstrap.php';

const ADMINS = ['super_admin', 'admin'];

/**
 * Only a super admin may change a super admin's role or status. Without this,
 * an admin (or a stolen admin token) could demote or suspend the owner, and a
 * suspension also deletes every one of the owner's sessions.
 */
function refuse_super_admin_target(mysqli $conn, array $admin, int $id): void {
  if ($admin['role'] === 'super_admin') return;
  $chk = $conn->prepare('SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $chk->bind_param('i', $id);
  $chk->execute();
  $row = $chk->get_result()->fetch_assoc();
  if ($row && $row['role'] === 'super_admin') fail('Only a super admin can change a super admin.', 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, ADMINS);
  $rows = [];
  $sql = 'SELECT u.id, u.name, u.email, u.role, u.client_id, u.cost_rate, u.totp_enabled, u.status, u.created_at,
                 c.company AS client_company
          FROM users u LEFT JOIN clients c ON c.id = u.client_id
          WHERE u.deleted_at IS NULL ORDER BY u.id ASC';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['cost_rate'] = (float)$r['cost_rate'];
      $r['totp_enabled'] = (bool)$r['totp_enabled'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $admin = require_auth($conn, ADMINS);
  $in = body();
  $name  = str_field($in, 'name', 200);
  $email = strtolower(str_field($in, 'email', 200));
  $pass  = (string)($in['password'] ?? '');
  $role  = str_field($in, 'role', 30);
  if ($name === '') fail('A name is required.');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('A valid email is required.');
  if (strlen($pass) < 8) fail('Password must be at least 8 characters.');
  if (!in_array($role, VALID_ROLES, true)) fail('Invalid role.');
  // Only a super_admin may create another super_admin.
  if ($role === 'super_admin' && $admin['role'] !== 'super_admin') fail('Only a super admin can create a super admin.', 403);

  // A `client`-role login MUST be bound to a real client; any other role never
  // carries a client_id. This binding is what portal.php trusts for isolation.
  $clientId = null;
  if ($role === 'client') {
    $clientId = isset($in['client_id']) ? (int)$in['client_id'] : 0;
    if ($clientId <= 0) fail('A client account must be linked to a client.');
    $chk = $conn->prepare('SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $chk->bind_param('i', $clientId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('That client does not exist.', 404);
  }

  $chk = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
  $chk->bind_param('s', $email);
  $chk->execute();
  if ($chk->get_result()->fetch_assoc()) fail('A user with that email already exists.', 409);

  $hash = password_hash($pass, PASSWORD_BCRYPT);
  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role, client_id) VALUES (?, ?, ?, ?, ?)');
  $stmt->bind_param('ssssi', $name, $email, $hash, $role, $clientId);
  if (!$stmt->execute()) fail('Could not create the user.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $admin['id'], 'user_create', "$email ($role)");
  ok(['id' => $newId], 201);
}

// Invite a staff member: create the account with a random password, then email a
// set-password link (7-day token) instead of handing over a temporary password.
if ($method === 'POST' && $action === 'invite') {
  $admin = require_auth($conn, ADMINS);
  $in = body();
  $name  = str_field($in, 'name', 200);
  $email = strtolower(str_field($in, 'email', 200));
  $role  = str_field($in, 'role', 30);
  if ($name === '') fail('A name is required.');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('A valid email is required.');
  if (!in_array($role, VALID_ROLES, true) || $role === 'client') fail('Pick a staff role.');
  if ($role === 'super_admin' && $admin['role'] !== 'super_admin') fail('Only a super admin can invite a super admin.', 403);
  if (($GLOBALS['SMTP_HOST'] ?? '') === '') fail('Email is not configured, so invites cannot be sent.', 503);

  $chk = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
  $chk->bind_param('s', $email);
  $chk->execute();
  if ($chk->get_result()->fetch_assoc()) fail('A user with that email already exists.', 409);

  $randomPass = bin2hex(random_bytes(16));
  $hash = password_hash($randomPass, PASSWORD_BCRYPT);
  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $name, $email, $hash, $role);
  if (!$stmt->execute()) fail('Could not create the user.', 500);
  $uid = $conn->insert_id;

  // Set-password token (reuses password_resets; 7-day window for an invite).
  $token = bin2hex(random_bytes(32));
  $exp = (new DateTime('+7 days'))->format('Y-m-d H:i:s');
  $ins = $conn->prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)');
  $ins->bind_param('iss', $uid, $token, $exp);
  $ins->execute();

  $appUrl = rtrim($GLOBALS['APP_URL'] ?? 'https://gakinz.com', '/');
  $link = "$appUrl/set-password#token=$token";
  require_once __DIR__ . '/_smtp.php';
  gk_send_email([
    'to' => $email,
    'subject' => 'You have been invited to GAkinzOS',
    'body' => "Hello $name,\n\nYou have been added to the GAkinz studio platform. Set your password to get started (link valid 7 days):\n$link\n\nGAkinz",
  ]);
  audit($conn, $admin['id'], 'user_invite', "$email ($role)");
  ok(['id' => $uid], 201);
}

if ($method === 'POST' && $action === 'role') {
  $admin = require_auth($conn, ADMINS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $role = str_field($in, 'role', 30);
  if ($id <= 0) fail('A user id is required.');
  if (!in_array($role, VALID_ROLES, true)) fail('Invalid role.');
  if ($id === $admin['id']) fail('You cannot change your own role.', 403);
  if ($role === 'super_admin' && $admin['role'] !== 'super_admin') fail('Only a super admin can grant super admin.', 403);
  refuse_super_admin_target($conn, $admin, $id);
  // A client binding is set at creation. You can't promote an account INTO
  // `client` here (no client_id to attach); switching a client account to a
  // staff role clears the binding so it can't keep portal access by accident.
  if ($role === 'client') fail('Create a client account from the client record instead.');

  $stmt = $conn->prepare('UPDATE users SET role = ?, client_id = NULL WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $role, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('User not found.', 404);
  audit($conn, $admin['id'], 'user_role', "#$id → $role");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'rate') {
  $admin = require_auth($conn, ADMINS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $rate = max(0, (float)($in['cost_rate'] ?? 0));
  if ($id <= 0) fail('A user id is required.');
  $stmt = $conn->prepare('UPDATE users SET cost_rate = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('di', $rate, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $chk = $conn->prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('User not found.', 404);
  }
  audit($conn, $admin['id'], 'user_rate', "#$id → £$rate/h");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'status') {
  $admin = require_auth($conn, ADMINS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A user id is required.');
  if (!in_array($status, ['active', 'suspended'], true)) fail('Invalid status.');
  if ($id === $admin['id']) fail('You cannot change your own status.', 403);
  refuse_super_admin_target($conn, $admin, $id);

  $stmt = $conn->prepare('UPDATE users SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('User not found.', 404);
  // A suspended user's existing sessions should stop working immediately.
  if ($status === 'suspended') {
    $del = $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ?');
    $del->bind_param('i', $id);
    $del->execute();
  }
  audit($conn, $admin['id'], 'user_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
