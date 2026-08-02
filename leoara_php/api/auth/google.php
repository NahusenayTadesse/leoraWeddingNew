<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$in = json_input();
$idToken = (string) ($in['credential'] ?? $in['id_token'] ?? '');

if (!$idToken) {
    json_error('Missing Google credential.', 422);
}

try {
    $user = Auth::loginWithGoogleIdToken($idToken);
    json_response([
        'success' => true,
        'user' => ['id' => (int) $user['id'], 'email' => $user['email']],
        'csrf_token' => csrf_token(),
    ]);
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 401);
}
