<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$token = (string) ($in['token'] ?? '');
$password = (string) ($in['password'] ?? '');

if (!$token || !$password) {
    json_error('Missing token or new password.', 422);
}

try {
    $ok = Auth::resetPassword($token, $password);
    if (!$ok) {
        json_error('This reset link is invalid or has expired. Please request a new one.', 400);
    }
    json_response(['success' => true, 'message' => 'Your password has been updated. You can log in now.']);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 422);
}
