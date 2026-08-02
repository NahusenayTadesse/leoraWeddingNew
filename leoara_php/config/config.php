<?php
/**
 * config/config.php
 *
 * Zero-dependency .env loader + app constants. cPanel shared hosting rarely
 * has Composer available by default, so this avoids requiring vlucas/dotenv.
 *
 * IMPORTANT: this file itself must NOT be web-accessible in a way that leaks
 * secrets — the provided .htaccess blocks direct requests to /config/.
 */

declare(strict_types=1);

if (!function_exists('leora_load_env')) {
    function leora_load_env(string $path): void
    {
        if (!is_file($path)) {
            // Fail loudly in a controlled way rather than silently running
            // with missing DB credentials.
            http_response_code(500);
            die('Server configuration error: .env file not found. Copy .env.example to .env and fill in your database credentials.');
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Strip matching surrounding quotes.
            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

if (!function_exists('env')) {
    function env(string $key, $default = null)
    {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
}

leora_load_env(dirname(__DIR__) . '/.env');

// ---------------------------------------------------------------------------
// App-wide constants
// ---------------------------------------------------------------------------
define('APP_ENV', env('APP_ENV', 'production'));
define('APP_URL', rtrim((string) env('APP_URL', ''), '/'));
define('APP_KEY', env('APP_KEY', ''));
define('SESSION_LIFETIME_MINUTES', (int) env('SESSION_LIFETIME_MINUTES', 120));
define('REMEMBER_ME_DAYS', (int) env('REMEMBER_ME_DAYS', 30));

define('MAIL_DRIVER', env('MAIL_DRIVER', 'php_mail'));
define('MAIL_FROM_ADDRESS', env('MAIL_FROM_ADDRESS', 'no-reply@localhost'));
define('MAIL_FROM_NAME', env('MAIL_FROM_NAME', 'Leora Events'));
define('SMTP_HOST', env('SMTP_HOST', ''));
define('SMTP_PORT', (int) env('SMTP_PORT', 587));
define('SMTP_USER', env('SMTP_USER', ''));
define('SMTP_PASS', env('SMTP_PASS', ''));
define('SMTP_ENCRYPTION', env('SMTP_ENCRYPTION', 'tls'));

define('GOOGLE_CLIENT_ID', env('GOOGLE_CLIENT_ID', ''));

define('SMS_DRIVER', env('SMS_DRIVER', 'log'));
define('SMS_API_URL', env('SMS_API_URL', ''));
define('SMS_API_KEY', env('SMS_API_KEY', ''));
define('SMS_SENDER_ID', env('SMS_SENDER_ID', 'LeoraEvents'));

if (APP_ENV === 'production') {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

date_default_timezone_set('Africa/Addis_Ababa');
