<?php
/**
 * includes/bootstrap.php
 * Include this at the very top of every page and API endpoint.
 * Starts a hardened session, loads config/DB, and pulls in shared helpers.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME_MINUTES * 60,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('leora_session');
    session_start();
}

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/Auth.php';

// Resolve "remember me" cookie into a session if the user isn't already
// logged in but has a valid long-lived token.
if (empty($_SESSION['user_id']) && !empty($_COOKIE['leora_remember'])) {
    Auth::attemptRememberLogin($_COOKIE['leora_remember']);
}
