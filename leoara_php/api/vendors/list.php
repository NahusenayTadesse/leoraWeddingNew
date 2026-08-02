<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$db = Database::connection();
$categorySlug = sanitize_str($_GET['category'] ?? null, 90);
$city = sanitize_str($_GET['city'] ?? null, 100);
$search = sanitize_str($_GET['q'] ?? null, 100);

$sql = "SELECT v.id, v.business_name, v.description, v.city, v.price_min, v.price_max,
               v.rating_avg, v.review_count, v.is_featured, v.is_verified, vc.name AS category, vc.slug AS category_slug
        FROM vendors v
        JOIN vendor_categories vc ON vc.id = v.category_id
        WHERE v.status = 'approved' AND v.deleted_at IS NULL";
$params = [];

if ($categorySlug) {
    $sql .= ' AND vc.slug = :slug';
    $params['slug'] = $categorySlug;
}
if ($city) {
    $sql .= ' AND v.city = :city';
    $params['city'] = $city;
}
if ($search) {
    $sql .= ' AND MATCH(v.business_name, v.description) AGAINST (:q IN NATURAL LANGUAGE MODE)';
    $params['q'] = $search;
}
$sql .= ' ORDER BY v.is_featured DESC, v.rating_avg DESC LIMIT 100';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$vendors = $stmt->fetchAll();

$categories = $db->query('SELECT id, name, slug, icon FROM vendor_categories ORDER BY sort_order ASC')->fetchAll();

json_response([
    'success' => true,
    'vendors' => $vendors,
    'categories' => $categories,
    'is_empty' => count($vendors) === 0,
]);
