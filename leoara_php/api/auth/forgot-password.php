<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$email = sanitize_str($in['email'] ?? null, 190);

if (!$email) {
    json_error('Please enter your email address.', 422);
}

Auth::requestPasswordReset($email);

// Always return success so we don't reveal which emails have accounts.
json_response(['success' => true, 'message' => 'If an account exists for that email, a reset link is on its way.']);
