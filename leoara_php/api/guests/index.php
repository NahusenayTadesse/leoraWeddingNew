<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

$couple = require_couple_api();
$db = Database::connection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM guest_lists WHERE couple_id = :cid AND deleted_at IS NULL ORDER BY full_name ASC');
    $stmt->execute(['cid' => $couple['id']]);
    json_response(['success' => true, 'guests' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    csrf_guard();
    $in = json_input();
    $name = sanitize_str($in['full_name'] ?? null, 150);
    if (!$name) {
        json_error('Guest name is required.', 422);
    }
    $stmt = $db->prepare(
        'INSERT INTO guest_lists (couple_id, full_name, email, phone, side, group_name, rsvp_status, plus_ones, meal_preference, notes, created_at, updated_at)
         VALUES (:cid, :name, :email, :phone, :side, :grp, :rsvp, :plus, :meal, :notes, NOW(), NOW())'
    );
    $stmt->execute([
        'cid' => $couple['id'],
        'name' => $name,
        'email' => sanitize_str($in['email'] ?? null, 190),
        'phone' => sanitize_str($in['phone'] ?? null, 30),
        'side' => in_array($in['side'] ?? '', ['bride', 'groom', 'both'], true) ? $in['side'] : 'both',
        'grp' => sanitize_str($in['group_name'] ?? null, 100),
        'rsvp' => in_array($in['rsvp_status'] ?? '', ['pending', 'confirmed', 'declined'], true) ? $in['rsvp_status'] : 'pending',
        'plus' => (int) ($in['plus_ones'] ?? 0),
        'meal' => sanitize_str($in['meal_preference'] ?? null, 100),
        'notes' => sanitize_str($in['notes'] ?? null, 255),
    ]);
    $id = (int) $db->lastInsertId();
    log_activity(current_user_id(), 'guest.created', 'guest', $id);
    json_response(['success' => true, 'id' => $id], 201);
}

if ($method === 'PUT') {
    csrf_guard();
    $in = json_input();
    $id = (int) ($in['id'] ?? 0);
    $own = $db->prepare('SELECT id FROM guest_lists WHERE id = :id AND couple_id = :cid AND deleted_at IS NULL');
    $own->execute(['id' => $id, 'cid' => $couple['id']]);
    if (!$id || !$own->fetch()) {
        json_error('Guest not found.', 404);
    }
    $allowed = ['full_name', 'email', 'phone', 'side', 'group_name', 'rsvp_status', 'plus_ones', 'meal_preference', 'notes'];
    $fields = [];
    $params = ['id' => $id];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $in)) {
            $fields[] = "$f = :$f";
            $params[$f] = $in[$f];
        }
    }
    if (!$fields) {
        json_error('Nothing to update.', 422);
    }
    $fields[] = 'updated_at = NOW()';
    $db->prepare('UPDATE guest_lists SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
    log_activity(current_user_id(), 'guest.updated', 'guest', $id);
    json_response(['success' => true]);
}

if ($method === 'DELETE') {
    csrf_guard();
    $id = (int) ($_GET['id'] ?? 0);
    $db->prepare('UPDATE guest_lists SET deleted_at = NOW() WHERE id = :id AND couple_id = :cid')
       ->execute(['id' => $id, 'cid' => $couple['id']]);
    log_activity(current_user_id(), 'guest.deleted', 'guest', $id);
    json_response(['success' => true]);
}

json_error('Method not allowed.', 405);
