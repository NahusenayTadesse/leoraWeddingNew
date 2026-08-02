<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$phone = (string) ($in['phone'] ?? '');
$otp = (string) ($in['otp'] ?? '');

if (!$phone || !$otp) {
    json_error('Please enter the code sent to your phone.', 422);
}

try {
    $user = Auth::verifyPhoneOtp($phone, $otp);
    json_response([
        'success' => true,
        'user' => ['id' => (int) $user['id'], 'phone' => $user['phone']],
        'csrf_token' => csrf_token(),
    ]);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 401);
}
