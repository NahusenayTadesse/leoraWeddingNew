<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$phone = (string) ($in['phone'] ?? '');

if (!$phone) {
    json_error('Please enter your phone number.', 422);
}

try {
    Auth::requestPhoneOtp($phone);
    json_response(['success' => true, 'message' => 'A verification code has been sent to your phone.']);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 422);
}
