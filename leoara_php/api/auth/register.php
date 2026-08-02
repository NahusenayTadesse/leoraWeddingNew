<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$email = sanitize_str($in['email'] ?? null, 190);
$password = (string) ($in['password'] ?? '');
$firstName = sanitize_str($in['first_name'] ?? null, 80);
$lastName = sanitize_str($in['last_name'] ?? null, 80);
$role = sanitize_str($in['role'] ?? 'bride', 20);

if (!$email || !$password || !$firstName) {
    json_error('Please fill in your name, email and password.', 422);
}

try {
    $userId = Auth::register($email, $password, $firstName, (string) $lastName, (string) $role);
    json_response([
        'success' => true,
        'message' => 'Account created. Please check your email to verify your account before logging in.',
        'user_id' => $userId,
    ], 201);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 422);
}
