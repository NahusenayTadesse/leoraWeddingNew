<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if (!is_logged_in()) {
    json_response(['success' => true, 'logged_in' => false]);
}

$db = Database::connection();
$stmt = $db->prepare(
    'SELECT u.id, u.email, u.email_verified_at, p.first_name, p.last_name
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = :id AND u.deleted_at IS NULL LIMIT 1'
);
$stmt->execute(['id' => current_user_id()]);
$user = $stmt->fetch();

if (!$user) {
    Auth::logout();
    json_response(['success' => true, 'logged_in' => false]);
}

$couple = current_couple();
$planSlug = $couple ? current_plan_slug($couple) : 'free';

json_response([
    'success' => true,
    'logged_in' => true,
    'csrf_token' => csrf_token(),
    'user' => [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'email_verified' => $user['email_verified_at'] !== null,
    ],
    'couple_id' => $couple['id'] ?? null,
    'plan' => $planSlug,
]);
