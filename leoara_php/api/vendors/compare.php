<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$couple = require_couple_api();
$db = Database::connection();
$planSlug = current_plan_slug($couple);
$maxCompare = $planSlug === 'free' ? 2 : 5;

$in = json_input();
$vendorIds = array_values(array_unique(array_map('intval', $in['vendor_ids'] ?? [])));

if (!$vendorIds) {
    json_error('Select at least one vendor to compare.', 422);
}
if (count($vendorIds) > $maxCompare) {
    json_error(
        $planSlug === 'free'
            ? "Free plan supports comparing up to $maxCompare vendors. Upgrade to Golden to compare up to 5 side by side."
            : "You can compare up to $maxCompare vendors at once.",
        403,
        ['max_compare' => $maxCompare, 'plan' => $planSlug]
    );
}

// Enforce Free plan's "3 budget estimator uses" limit.
if ($planSlug === 'free') {
    $used = $db->prepare('SELECT COUNT(*) AS c FROM budget_comparisons WHERE couple_id = :cid');
    $used->execute(['cid' => $couple['id']]);
    $usedCount = (int) $used->fetch()['c'];
    if ($usedCount >= 3) {
        json_error(
            "You've used all 3 free budget estimator runs. Upgrade to Golden for unlimited access.",
            403,
            ['upgrade_required' => true]
        );
    }
}

$placeholders = implode(',', array_fill(0, count($vendorIds), '?'));
$stmt = $db->prepare(
    "SELECT v.id, v.business_name, v.city, v.price_min, v.price_max, v.rating_avg, v.review_count,
            v.is_verified, vc.name AS category
     FROM vendors v
     JOIN vendor_categories vc ON vc.id = v.category_id
     WHERE v.id IN ($placeholders) AND v.status = 'approved' AND v.deleted_at IS NULL"
);
$stmt->execute($vendorIds);
$vendors = $stmt->fetchAll();

if (!$vendors) {
    json_error('No approved vendors found for that selection.', 404);
}

// Simple, transparent value score: higher rating & lower price-per-average
// scores better. Fully computed from real vendor rows — no fabricated data.
$avgPrice = array_sum(array_map(fn($v) => ((float) $v['price_min'] + (float) $v['price_max']) / 2, $vendors)) / count($vendors);
foreach ($vendors as &$v) {
    $mid = ((float) $v['price_min'] + (float) $v['price_max']) / 2;
    $priceScore = $avgPrice > 0 ? max(0, 1 - (($mid - $avgPrice) / max($avgPrice, 1))) : 0.5;
    $ratingScore = ((float) $v['rating_avg']) / 5;
    $v['value_score'] = round(($priceScore * 0.5 + $ratingScore * 0.5) * 100);
}
unset($v);
usort($vendors, fn($a, $b) => $b['value_score'] <=> $a['value_score']);

$stmt = $db->prepare(
    'INSERT INTO budget_comparisons (couple_id, name, vendor_ids, result_summary, created_at, updated_at)
     VALUES (:cid, :name, :vids, :res, NOW(), NOW())'
);
$stmt->execute([
    'cid' => $couple['id'],
    'name' => 'Comparison ' . date('M j, Y'),
    'vids' => json_encode($vendorIds),
    'res' => json_encode($vendors),
]);

log_activity(current_user_id(), 'budget.compared_vendors', 'budget_comparison', (int) $db->lastInsertId());

json_response([
    'success' => true,
    'plan' => $planSlug,
    'max_compare' => $maxCompare,
    'vendors' => $vendors,
    'recommended_id' => $vendors[0]['id'] ?? null,
]);
