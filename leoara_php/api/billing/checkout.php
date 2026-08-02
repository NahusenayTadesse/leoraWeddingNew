<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

/**
 * IMPORTANT — PAYMENT GATEWAY INTEGRATION REQUIRED BEFORE GOING LIVE.
 *
 * This endpoint records the payment/subscription rows correctly, but it does
 * NOT yet call out to a real payment processor. For Ethiopian shared hosting
 * this is typically Telebirr, CBE Birr, or an aggregator like Chapa/Santimpay.
 * Wire the chosen gateway's server-to-server confirmation callback to flip
 * `payments.status` from 'pending' to 'completed' (or 'failed') instead of
 * marking it 'completed' immediately as this scaffold does, and store the
 * gateway's transaction id in `transaction_ref`.
 */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$couple = require_couple_api();
csrf_guard();

$in = json_input();
$planSlug = sanitize_str($in['plan_slug'] ?? null, 20);
$couponCode = strtoupper(trim((string) ($in['coupon_code'] ?? '')));
$paymentMethod = sanitize_str($in['payment_method'] ?? 'telebirr', 30);

$db = Database::connection();

$planStmt = $db->prepare('SELECT * FROM subscription_plans WHERE slug = :slug AND is_active = 1 LIMIT 1');
$planStmt->execute(['slug' => $planSlug]);
$plan = $planStmt->fetch();
if (!$plan) {
    json_error('Unknown or inactive plan.', 422);
}

$db->beginTransaction();
try {
    $price = (float) $plan['price'];
    $discount = 0.0;
    $couponId = null;

    if ($couponCode) {
        $couponStmt = $db->prepare('SELECT * FROM coupons WHERE code = :code AND is_active = 1 LIMIT 1 FOR UPDATE');
        $couponStmt->execute(['code' => $couponCode]);
        $coupon = $couponStmt->fetch();
        if ($coupon && (!$coupon['expires_at'] || strtotime($coupon['expires_at']) >= time())
            && ($coupon['max_uses'] === null || (int) $coupon['uses_count'] < (int) $coupon['max_uses'])) {
            $discount = $coupon['type'] === 'percent'
                ? round($price * ((float) $coupon['value'] / 100), 2)
                : min($price, (float) $coupon['value']);
            $couponId = (int) $coupon['id'];
            $db->prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = :id')->execute(['id' => $couponId]);
        }
    }

    $total = max(0, $price - $discount);

    // Deactivate any existing active subscription, then create the new one.
    $db->prepare("UPDATE subscriptions SET status = 'cancelled' WHERE couple_id = :cid AND status = 'active'")
       ->execute(['cid' => $couple['id']]);

    $subStmt = $db->prepare(
        "INSERT INTO subscriptions (couple_id, subscription_plan_id, status, started_at, created_at, updated_at)
         VALUES (:cid, :pid, 'active', NOW(), NOW(), NOW())"
    );
    $subStmt->execute(['cid' => $couple['id'], 'pid' => $plan['id']]);
    $subscriptionId = (int) $db->lastInsertId();

    // NOTE: status is set to 'completed' immediately here only because no
    // live payment gateway is wired up yet — see the file header comment.
    $payStmt = $db->prepare(
        "INSERT INTO payments (couple_id, subscription_id, amount, currency, payment_method, coupon_id, discount_amount, status, transaction_ref, paid_at, created_at, updated_at)
         VALUES (:cid, :sid, :amount, 'ETB', :method, :coupon_id, :discount, 'completed', :ref, NOW(), NOW(), NOW())"
    );
    $payStmt->execute([
        'cid' => $couple['id'],
        'sid' => $subscriptionId,
        'amount' => $total,
        'method' => $paymentMethod,
        'coupon_id' => $couponId,
        'discount' => $discount,
        'ref' => 'DEMO-' . strtoupper(bin2hex(random_bytes(6))),
    ]);

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    error_log('[Leora Checkout] failed: ' . $e->getMessage());
    json_error('Payment could not be processed. Please try again.', 500);
}

log_activity(current_user_id(), 'subscription.purchased', 'subscription', $subscriptionId, ['plan' => $planSlug, 'total' => $total]);

json_response([
    'success' => true,
    'message' => 'Payment recorded and your plan is now active.',
    'total_paid' => $total,
    'plan' => $planSlug,
]);
