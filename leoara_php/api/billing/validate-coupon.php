<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

require_login_api();

$in = json_input();
$code = strtoupper(trim((string) ($in['code'] ?? '')));
$planSlug = sanitize_str($in['plan_slug'] ?? 'golden', 20);

if (!$code) {
    json_error('Enter a coupon code.', 422);
}

$db = Database::connection();
$stmt = $db->prepare('SELECT * FROM coupons WHERE code = :code AND is_active = 1 LIMIT 1');
$stmt->execute(['code' => $code]);
$coupon = $stmt->fetch();

if (!$coupon) {
    json_error('That coupon code is not valid.', 404);
}
if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
    json_error('This coupon has expired.', 410);
}
if ($coupon['max_uses'] !== null && (int) $coupon['uses_count'] >= (int) $coupon['max_uses']) {
    json_error('This coupon has reached its usage limit.', 410);
}

$planStmt = $db->prepare('SELECT price FROM subscription_plans WHERE slug = :slug LIMIT 1');
$planStmt->execute(['slug' => $planSlug]);
$plan = $planStmt->fetch();
if (!$plan) {
    json_error('Unknown plan.', 422);
}

$price = (float) $plan['price'];
$discount = $coupon['type'] === 'percent'
    ? round($price * ((float) $coupon['value'] / 100), 2)
    : min($price, (float) $coupon['value']);

json_response([
    'success' => true,
    'coupon' => [
        'code' => $coupon['code'],
        'type' => $coupon['type'],
        'value' => (float) $coupon['value'],
        'discount_amount' => $discount,
        'label' => $coupon['type'] === 'percent' ? ($coupon['value'] . '% off') : ('ETB ' . number_format((float) $coupon['value']) . ' off'),
    ],
]);
