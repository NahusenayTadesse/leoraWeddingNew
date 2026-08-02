<?php
/**
 * includes/helpers.php
 * Small shared utilities used across pages and API endpoints.
 */

declare(strict_types=1);

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = []): void
{
    json_response(array_merge(['success' => false, 'error' => $message], $extra), $status);
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_verify(?string $token): bool
{
    return is_string($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/** Require a valid CSRF token on state-changing API requests, else 419. */
function csrf_guard(): void
{
    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if (!csrf_verify($headerToken)) {
        json_error('Your session expired. Please refresh the page and try again.', 419);
    }
}

function is_logged_in(): bool
{
    return !empty($_SESSION['user_id']);
}

function current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

/** Fetch (and lazily create) the couple record for the logged-in user. */
function current_couple(): ?array
{
    if (!is_logged_in()) {
        return null;
    }
    $db = Database::connection();
    $userId = current_user_id();

    $stmt = $db->prepare(
        'SELECT * FROM couples WHERE (partner1_user_id = :uid OR partner2_user_id = :uid) AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute(['uid' => $userId]);
    $couple = $stmt->fetch();

    if ($couple) {
        return $couple;
    }

    // First time this user has touched a couple-scoped feature: create one.
    $inviteCode = strtoupper(bin2hex(random_bytes(4)));
    $insert = $db->prepare(
        'INSERT INTO couples (partner1_user_id, invite_code, created_at, updated_at) VALUES (:uid, :code, NOW(), NOW())'
    );
    $insert->execute(['uid' => $userId, 'code' => $inviteCode]);
    $coupleId = (int) $db->lastInsertId();

    $db->prepare('INSERT INTO wedding_plans (couple_id, status, created_at, updated_at) VALUES (:cid, "planning", NOW(), NOW())')
       ->execute(['cid' => $coupleId]);

    $stmt->execute(['uid' => $userId]);
    return $stmt->fetch();
}

function require_login_api(): int
{
    if (!is_logged_in()) {
        json_error('You must be logged in.', 401);
    }
    return current_user_id();
}

/** For pages that should hard-redirect (not soft-preview) when logged out. */
function require_login_page(string $redirectTo = '/leora-events-login.html'): void
{
    if (!is_logged_in()) {
        header('Location: ' . $redirectTo . '?redirect=' . urlencode($_SERVER['REQUEST_URI'] ?? ''));
        exit;
    }
}

function require_couple_api(): array
{
    require_login_api();
    $couple = current_couple();
    if (!$couple) {
        json_error('Could not resolve your wedding profile.', 500);
    }
    return $couple;
}

function sanitize_str(?string $value, int $maxLen = 255): ?string
{
    if ($value === null) {
        return null;
    }
    $value = trim(strip_tags($value));
    return mb_substr($value, 0, $maxLen);
}

function log_activity(?int $userId, string $action, ?string $entityType = null, ?int $entityId = null, array $meta = []): void
{
    try {
        $db = Database::connection();
        $stmt = $db->prepare(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, meta, created_at)
             VALUES (:uid, :action, :etype, :eid, :ip, :ua, :meta, NOW())'
        );
        $stmt->execute([
            'uid'    => $userId,
            'action' => $action,
            'etype'  => $entityType,
            'eid'    => $entityId,
            'ip'     => $_SERVER['REMOTE_ADDR'] ?? null,
            'ua'     => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            'meta'   => json_encode($meta),
        ]);
    } catch (Throwable $e) {
        error_log('[Leora] activity log failed: ' . $e->getMessage());
    }
}

/**
 * The couple's current subscription plan slug: 'free' | 'golden' | 'platinum'.
 * Falls back to 'free' if no active subscription row exists.
 */
function current_plan_slug(array $couple): string
{
    $db = Database::connection();
    $stmt = $db->prepare(
        'SELECT sp.slug FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
         WHERE s.couple_id = :cid AND s.status = "active"
         ORDER BY s.started_at DESC LIMIT 1'
    );
    $stmt->execute(['cid' => $couple['id']]);
    $row = $stmt->fetch();
    return $row['slug'] ?? 'free';
}
