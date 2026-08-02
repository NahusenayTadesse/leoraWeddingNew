<?php
/**
 * config/database.php
 * PDO singleton. Uses prepared statements everywhere in the app — never
 * concatenate user input into SQL.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

final class Database
{
    private static ?PDO $instance = null;

    public static function connection(): PDO
    {
        if (self::$instance === null) {
            $host = env('DB_HOST', 'localhost');
            $port = env('DB_PORT', '3306');
            $name = env('DB_NAME');
            $user = env('DB_USER');
            $pass = env('DB_PASS');

            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                error_log('[Leora DB] Connection failed: ' . $e->getMessage());
                http_response_code(500);
                if (APP_ENV !== 'production') {
                    die('Database connection failed: ' . $e->getMessage());
                }
                die('Database connection failed. Please try again shortly.');
            }
        }

        return self::$instance;
    }
}
