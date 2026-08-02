<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

$couple = require_couple_api();
$db = Database::connection();
$coupleId = $couple['id'];

// --- Wedding plan / countdown ---
$plan = $db->prepare('SELECT * FROM wedding_plans WHERE couple_id = :cid LIMIT 1');
$plan->execute(['cid' => $coupleId]);
$plan = $plan->fetch() ?: null;

// --- Budget summary ---
$budget = $db->prepare(
    'SELECT COALESCE(SUM(estimated_cost),0) AS estimated, COALESCE(SUM(actual_cost),0) AS actual, COUNT(*) AS item_count
     FROM budget_items WHERE couple_id = :cid AND deleted_at IS NULL'
);
$budget->execute(['cid' => $coupleId]);
$budget = $budget->fetch();

// --- Guest summary ---
$guests = $db->prepare(
    "SELECT COUNT(*) AS total,
            SUM(rsvp_status = 'confirmed') AS confirmed,
            SUM(rsvp_status = 'declined') AS declined,
            SUM(rsvp_status = 'pending') AS pending
     FROM guest_lists WHERE couple_id = :cid AND deleted_at IS NULL"
);
$guests->execute(['cid' => $coupleId]);
$guests = $guests->fetch();

// --- Task / progress summary ---
$tasks = $db->prepare(
    "SELECT COUNT(*) AS total, SUM(status = 'done') AS done
     FROM tasks WHERE couple_id = :cid AND deleted_at IS NULL"
);
$tasks->execute(['cid' => $coupleId]);
$tasks = $tasks->fetch();
$progressPct = ((int) $tasks['total']) > 0 ? (int) round((int) $tasks['done'] / (int) $tasks['total'] * 100) : 0;

$upcomingTasks = $db->prepare(
    "SELECT id, title, due_date, priority, status FROM tasks
     WHERE couple_id = :cid AND deleted_at IS NULL AND status != 'done'
     ORDER BY (due_date IS NULL), due_date ASC LIMIT 5"
);
$upcomingTasks->execute(['cid' => $coupleId]);
$upcomingTasks = $upcomingTasks->fetchAll();

// --- Saved vendors ---
$savedVendors = $db->prepare(
    'SELECT v.id, v.business_name, v.rating_avg, vc.name AS category
     FROM saved_vendors sv
     JOIN vendors v ON v.id = sv.vendor_id
     JOIN vendor_categories vc ON vc.id = v.category_id
     WHERE sv.couple_id = :cid ORDER BY sv.created_at DESC LIMIT 6'
);
$savedVendors->execute(['cid' => $coupleId]);
$savedVendors = $savedVendors->fetchAll();

// --- Recent activity (this couple's own users only) ---
$recentActivity = $db->prepare(
    "SELECT action, entity_type, created_at FROM activity_logs
     WHERE user_id IN (:u1, :u2) ORDER BY created_at DESC LIMIT 8"
);
$recentActivity->execute([
    'u1' => $couple['partner1_user_id'],
    'u2' => $couple['partner2_user_id'] ?? 0,
]);
$recentActivity = $recentActivity->fetchAll();

// --- Notifications ---
$notifications = $db->prepare(
    'SELECT id, type, title, body, is_read, created_at FROM notifications
     WHERE user_id = :uid ORDER BY created_at DESC LIMIT 8'
);
$notifications->execute(['uid' => current_user_id()]);
$notifications = $notifications->fetchAll();

// --- Wedding events timeline (Engagement > Shimgelegna > ... > Kilikil) ---
$events = $db->prepare(
    'SELECT id, event_type, event_name, event_date, venue_name FROM wedding_events
     WHERE couple_id = :cid AND deleted_at IS NULL ORDER BY sort_order ASC, event_date ASC'
);
$events->execute(['cid' => $coupleId]);
$events = $events->fetchAll();

$daysUntilWedding = null;
if (!empty($plan['wedding_date'])) {
    $diff = (new DateTime($plan['wedding_date']))->diff(new DateTime('today'));
    $daysUntilWedding = (int) $diff->format('%r%a') * -1;
}

json_response([
    'success' => true,
    'wedding_plan' => $plan,
    'days_until_wedding' => $daysUntilWedding,
    'progress_pct' => $progressPct,
    'budget' => [
        'estimated_total' => (float) $budget['estimated'],
        'actual_total' => (float) $budget['actual'],
        'item_count' => (int) $budget['item_count'],
        'remaining' => $plan && $plan['total_budget'] !== null
            ? (float) $plan['total_budget'] - (float) $budget['actual']
            : null,
    ],
    'guests' => [
        'total' => (int) $guests['total'],
        'confirmed' => (int) $guests['confirmed'],
        'declined' => (int) $guests['declined'],
        'pending' => (int) $guests['pending'],
    ],
    'tasks' => [
        'total' => (int) $tasks['total'],
        'done' => (int) $tasks['done'],
        'upcoming' => $upcomingTasks,
    ],
    'saved_vendors' => $savedVendors,
    'recent_activity' => $recentActivity,
    'notifications' => $notifications,
    'wedding_events' => $events,
    'plan_slug' => current_plan_slug($couple),
]);
