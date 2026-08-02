<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

$couple = require_couple_api();
$db = Database::connection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->prepare(
        'SELECT bi.*, bc.name AS category_name, bc.icon AS category_icon
         FROM budget_items bi
         JOIN budget_categories bc ON bc.id = bi.budget_category_id
         WHERE bi.couple_id = :cid AND bi.deleted_at IS NULL
         ORDER BY bi.created_at DESC'
    );
    $stmt->execute(['cid' => $couple['id']]);
    $items = $stmt->fetchAll();

    $totals = $db->prepare(
        'SELECT COALESCE(SUM(estimated_cost),0) AS estimated, COALESCE(SUM(actual_cost),0) AS actual
         FROM budget_items WHERE couple_id = :cid AND deleted_at IS NULL'
    );
    $totals->execute(['cid' => $couple['id']]);

    json_response(['success' => true, 'items' => $items, 'totals' => $totals->fetch()]);
}

if ($method === 'POST') {
    csrf_guard();
    $in = json_input();
    $categoryId = (int) ($in['budget_category_id'] ?? 0);
    $name = sanitize_str($in['name'] ?? null, 150);
    $estimated = (float) ($in['estimated_cost'] ?? 0);
    $actual = (float) ($in['actual_cost'] ?? 0);
    $status = in_array($in['status'] ?? '', ['planned', 'booked', 'paid'], true) ? $in['status'] : 'planned';
    $dueDate = !empty($in['due_date']) ? $in['due_date'] : null;
    $notes = sanitize_str($in['notes'] ?? null, 1000);

    if (!$categoryId || !$name) {
        json_error('Category and item name are required.', 422);
    }

    // Verify category belongs to this couple or is a system template.
    $catCheck = $db->prepare('SELECT id FROM budget_categories WHERE id = :id AND (couple_id = :cid OR is_system = 1) AND deleted_at IS NULL');
    $catCheck->execute(['id' => $categoryId, 'cid' => $couple['id']]);
    if (!$catCheck->fetch()) {
        json_error('Invalid budget category.', 422);
    }

    $stmt = $db->prepare(
        'INSERT INTO budget_items (couple_id, budget_category_id, name, estimated_cost, actual_cost, status, due_date, notes, created_at, updated_at)
         VALUES (:cid, :bcid, :name, :est, :act, :status, :due, :notes, NOW(), NOW())'
    );
    $stmt->execute([
        'cid' => $couple['id'], 'bcid' => $categoryId, 'name' => $name,
        'est' => $estimated, 'act' => $actual, 'status' => $status, 'due' => $dueDate, 'notes' => $notes,
    ]);
    $id = (int) $db->lastInsertId();
    log_activity(current_user_id(), 'budget_item.created', 'budget_item', $id);
    json_response(['success' => true, 'id' => $id], 201);
}

if ($method === 'PUT') {
    csrf_guard();
    $in = json_input();
    $id = (int) ($in['id'] ?? 0);
    if (!$id) {
        json_error('Missing item id.', 422);
    }

    // Ownership check — a couple can only ever touch their own budget items.
    $own = $db->prepare('SELECT id FROM budget_items WHERE id = :id AND couple_id = :cid AND deleted_at IS NULL');
    $own->execute(['id' => $id, 'cid' => $couple['id']]);
    if (!$own->fetch()) {
        json_error('Item not found.', 404);
    }

    $fields = [];
    $params = ['id' => $id];
    foreach (['name' => 'str', 'estimated_cost' => 'float', 'actual_cost' => 'float', 'status' => 'str', 'due_date' => 'str', 'notes' => 'str', 'budget_category_id' => 'int'] as $field => $type) {
        if (array_key_exists($field, $in)) {
            $fields[] = "$field = :$field";
            $params[$field] = $type === 'float' ? (float) $in[$field] : (($type === 'int') ? (int) $in[$field] : $in[$field]);
        }
    }
    if (!$fields) {
        json_error('Nothing to update.', 422);
    }
    $fields[] = 'updated_at = NOW()';
    $sql = 'UPDATE budget_items SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $db->prepare($sql)->execute($params);

    log_activity(current_user_id(), 'budget_item.updated', 'budget_item', $id);
    json_response(['success' => true]);
}

if ($method === 'DELETE') {
    csrf_guard();
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        json_error('Missing item id.', 422);
    }
    $stmt = $db->prepare('UPDATE budget_items SET deleted_at = NOW() WHERE id = :id AND couple_id = :cid');
    $stmt->execute(['id' => $id, 'cid' => $couple['id']]);
    log_activity(current_user_id(), 'budget_item.deleted', 'budget_item', $id);
    json_response(['success' => true]);
}

json_error('Method not allowed.', 405);
