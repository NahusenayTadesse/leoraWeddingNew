<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$email = sanitize_str($in['email'] ?? null, 190);
$password = (string) ($in['password'] ?? '');
$remember = !empty($in['remember']);

if (!$email || !$password) {
    json_error('Please enter your email and password.', 422);
}

try {
    $user = Auth::login($email, $password, $remember);
    json_response([
        'success' => true,
        'user' => [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'email_verified' => $user['email_verified_at'] !== null,
        ],
        'csrf_token' => csrf_token(),
    ]);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 401);
}
