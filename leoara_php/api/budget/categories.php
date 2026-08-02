<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

$couple = require_couple_api();
$db = Database::connection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Every couple sees the system template categories PLUS any custom ones
    // they've added themselves. Nothing here is another user's data.
    $stmt = $db->prepare(
        'SELECT id, name, icon, sort_order, is_system FROM budget_categories
         WHERE (couple_id = :cid OR is_system = 1) AND deleted_at IS NULL
         ORDER BY is_system DESC, sort_order ASC, name ASC'
    );
    $stmt->execute(['cid' => $couple['id']]);
    json_response(['success' => true, 'categories' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_guard();
    $in = json_input();
    $name = sanitize_str($in['name'] ?? null, 100);
    $icon = sanitize_str($in['icon'] ?? '📦', 10);
    if (!$name) {
        json_error('Category name is required.', 422);
    }
    $stmt = $db->prepare(
        'INSERT INTO budget_categories (couple_id, name, icon, is_system, created_at, updated_at)
         VALUES (:cid, :name, :icon, 0, NOW(), NOW())'
    );
    $stmt->execute(['cid' => $couple['id'], 'name' => $name, 'icon' => $icon]);
    log_activity(current_user_id(), 'budget_category.created', 'budget_category', (int) $db->lastInsertId());
    json_response(['success' => true, 'id' => (int) $db->lastInsertId()], 201);
}

json_error('Method not allowed.', 405);
