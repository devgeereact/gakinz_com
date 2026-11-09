<?php
/**
 * Retired 2026-11-09 (D-057). Google sign-in runs inside Clerk now, so the server's own OAuth bounce is gone.
 * A release never deletes a file on the server, so the live copy is replaced by this stub instead: it answers
 * 404 like any missing endpoint, reads no input, loads no settings and makes no outbound call.
 */
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo json_encode(['error' => 'Not found.']);
