<?php
/**
 * Retired 2026-11-01. No screen calls the weather proxy since the cleanup of that day.
 * A release never deletes a file on the server, so the live copy is replaced by this
 * stub instead: it answers 404 like any missing endpoint, reads no input, loads no
 * settings and makes no outbound call (go-live security audit, Semgrep findings).
 */
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo json_encode(['error' => 'Not found.']);
