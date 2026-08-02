<?php
/**
 * includes/Auth.php
 * All authentication logic lives here. Pages and API endpoints call these
 * static methods rather than touching sessions or password hashes directly.
 */

declare(strict_types=1);

require_once __DIR__ . '/Mailer.php';
require_once __DIR__ . '/SmsSender.php';

final class Auth
{
    private const MAX_FAILED_LOGINS = 5;
    private const LOCKOUT_MINUTES = 15;

    /**
     * Register a new user + profile + couple record. Returns the new user id.
     * Throws RuntimeException with a user-facing message on failure.
     */
    public static function register(string $email, string $password, string $firstName, string $lastName, string $role): int
    {
        $email = mb_strtolower(trim($email));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Please enter a valid email address.');
        }
        if (strlen($password) < 8) {
            throw new RuntimeException('Password must be at least 8 characters.');
        }
        if (!in_array($role, ['bride', 'groom', 'planner', 'vendor'], true)) {
            $role = 'bride';
        }

        $db = Database::connection();

        $existing = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $existing->execute(['email' => $email]);
        if ($existing->fetch()) {
            throw new RuntimeException('An account with that email already exists. Try logging in instead.');
        }

        $db->beginTransaction();
        try {
            $hash = password_hash($password, PASSWORD_BCRYPT);

            $stmt = $db->prepare(
                'INSERT INTO users (email, password_hash, status, created_at, updated_at)
                 VALUES (:email, :hash, "pending", NOW(), NOW())'
            );
            $stmt->execute(['email' => $email, 'hash' => $hash]);
            $userId = (int) $db->lastInsertId();

            $db->prepare(
                'INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
                 VALUES (:uid, :fn, :ln, NOW(), NOW())'
            )->execute(['uid' => $userId, 'fn' => $firstName, 'ln' => $lastName]);

            $roleRow = $db->prepare('SELECT id FROM roles WHERE name = :name LIMIT 1');
            $roleRow->execute(['name' => $role]);
            if ($r = $roleRow->fetch()) {
                $db->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)')
                   ->execute(['uid' => $userId, 'rid' => $r['id']]);
            }

            // Couples get a couple + wedding_plan + free subscription row so
            // the dashboard has something real (not fake) to read from day one.
            if (in_array($role, ['bride', 'groom'], true)) {
                $inviteCode = strtoupper(bin2hex(random_bytes(4)));
                $db->prepare(
                    'INSERT INTO couples (partner1_user_id, invite_code, created_at, updated_at) VALUES (:uid, :code, NOW(), NOW())'
                )->execute(['uid' => $userId, 'code' => $inviteCode]);
                $coupleId = (int) $db->lastInsertId();

                $db->prepare('INSERT INTO wedding_plans (couple_id, status, created_at, updated_at) VALUES (:cid, "planning", NOW(), NOW())')
                   ->execute(['cid' => $coupleId]);

                $freePlan = $db->query("SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1")->fetch();
                if ($freePlan) {
                    $db->prepare(
                        'INSERT INTO subscriptions (couple_id, subscription_plan_id, status, started_at, created_at, updated_at)
                         VALUES (:cid, :pid, "active", NOW(), NOW(), NOW())'
                    )->execute(['cid' => $coupleId, 'pid' => $freePlan['id']]);
                }
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            error_log('[Leora Auth] register failed: ' . $e->getMessage());
            throw new RuntimeException('Something went wrong creating your account. Please try again.');
        }

        self::sendVerificationEmail($userId, $email, $firstName);
        log_activity($userId, 'user.registered', 'user', $userId);

        return $userId;
    }

    public static function sendVerificationEmail(int $userId, string $email, string $firstName): void
    {
        $db = Database::connection();
        $token = bin2hex(random_bytes(32));
        $db->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at, created_at)
             VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())'
        )->execute(['uid' => $userId, 'hash' => hash('sha256', $token)]);

        Mailer::sendVerificationEmail($email, $firstName, $token);
    }

    public static function verifyEmail(string $token): bool
    {
        $db = Database::connection();
        $hash = hash('sha256', $token);

        $stmt = $db->prepare(
            'SELECT * FROM email_verifications WHERE token_hash = :hash AND verified_at IS NULL AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['hash' => $hash]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }

        $db->prepare('UPDATE email_verifications SET verified_at = NOW() WHERE id = :id')->execute(['id' => $row['id']]);
        $db->prepare('UPDATE users SET status = "active", email_verified_at = NOW() WHERE id = :id')->execute(['id' => $row['user_id']]);
        log_activity((int) $row['user_id'], 'user.email_verified', 'user', (int) $row['user_id']);

        return true;
    }

    /**
     * Attempt login. Returns the user row on success.
     * Throws RuntimeException with a safe, generic user-facing message on failure.
     */
    public static function login(string $email, string $password, bool $remember = false): array
    {
        $email = mb_strtolower(trim($email));
        $db = Database::connection();

        $stmt = $db->prepare('SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        // Constant-ish response whether or not the user exists, to avoid
        // leaking which emails are registered.
        $genericError = 'Incorrect email or password.';

        if (!$user) {
            throw new RuntimeException($genericError);
        }

        if (!empty($user['locked_until']) && strtotime($user['locked_until']) > time()) {
            throw new RuntimeException('Too many failed attempts. Please try again in a few minutes.');
        }

        if (!password_verify($password, (string) ($user['password_hash'] ?? ''))) {
            $failed = (int) $user['failed_login_count'] + 1;
            $lockUntil = $failed >= self::MAX_FAILED_LOGINS
                ? (new DateTime("+" . self::LOCKOUT_MINUTES . " minutes"))->format('Y-m-d H:i:s')
                : null;
            $db->prepare('UPDATE users SET failed_login_count = :f, locked_until = :l WHERE id = :id')
               ->execute(['f' => $failed, 'l' => $lockUntil, 'id' => $user['id']]);
            throw new RuntimeException($genericError);
        }

        if ($user['status'] === 'suspended') {
            throw new RuntimeException('This account has been suspended. Contact support for help.');
        }

        $db->prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = :ip WHERE id = :id')
           ->execute(['ip' => $_SERVER['REMOTE_ADDR'] ?? null, 'id' => $user['id']]);

        self::establishSession((int) $user['id']);

        if ($remember) {
            self::issueRememberToken((int) $user['id']);
        }

        log_activity((int) $user['id'], 'user.login', 'user', (int) $user['id']);

        return $user;
    }

    private static function establishSession(int $userId): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['login_at'] = time();
    }

    private static function issueRememberToken(int $userId): void
    {
        $db = Database::connection();
        $selector = bin2hex(random_bytes(9));
        $validator = bin2hex(random_bytes(33));
        $token = $selector . ':' . $validator;

        $db->prepare('UPDATE users SET remember_token = :t WHERE id = :id')
           ->execute(['t' => hash('sha256', $token), 'id' => $userId]);

        setcookie('leora_remember', $token, [
            'expires'  => time() + REMEMBER_ME_DAYS * 86400,
            'path'     => '/',
            'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function attemptRememberLogin(string $cookieValue): void
    {
        $db = Database::connection();
        $hash = hash('sha256', $cookieValue);

        $stmt = $db->prepare('SELECT id FROM users WHERE remember_token = :t AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['t' => $hash]);
        $user = $stmt->fetch();

        if ($user) {
            self::establishSession((int) $user['id']);
        }
    }

    public static function logout(): void
    {
        $userId = current_user_id();
        if ($userId) {
            Database::connection()->prepare('UPDATE users SET remember_token = NULL WHERE id = :id')->execute(['id' => $userId]);
            log_activity($userId, 'user.logout', 'user', $userId);
        }
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        setcookie('leora_remember', '', time() - 42000, '/');
    }

    // ------------------------------------------------------------------
    // GOOGLE SIGN-IN
    // ------------------------------------------------------------------

    /**
     * Verifies a Google Identity Services ID token server-side (via
     * Google's tokeninfo endpoint — no client library / Composer needed)
     * and logs the user in, creating an account on first sign-in.
     * Returns the user row.
     */
    public static function loginWithGoogleIdToken(string $idToken): array
    {
        if (GOOGLE_CLIENT_ID === '') {
            throw new RuntimeException('Google Sign-In is not configured on this site yet.');
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            throw new RuntimeException('Could not verify your Google sign-in. Please try again.');
        }

        $payload = json_decode($response, true);

        if (!is_array($payload) || ($payload['aud'] ?? '') !== GOOGLE_CLIENT_ID) {
            throw new RuntimeException('This Google sign-in could not be verified for this site.');
        }
        if (!in_array($payload['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) {
            throw new RuntimeException('Invalid token issuer.');
        }
        if (empty($payload['email_verified']) || $payload['email_verified'] === 'false') {
            throw new RuntimeException('Your Google account email is not verified.');
        }

        $googleId = (string) $payload['sub'];
        $email = mb_strtolower((string) $payload['email']);
        $firstName = $payload['given_name'] ?? explode(' ', $payload['name'] ?? 'Guest')[0];
        $lastName = $payload['family_name'] ?? '';

        $db = Database::connection();

        $stmt = $db->prepare('SELECT * FROM users WHERE google_id = :gid OR email = :email LIMIT 1');
        $stmt->execute(['gid' => $googleId, 'email' => $email]);
        $user = $stmt->fetch();

        if ($user) {
            if (empty($user['google_id'])) {
                $db->prepare('UPDATE users SET google_id = :gid WHERE id = :id')->execute(['gid' => $googleId, 'id' => $user['id']]);
            }
            if (empty($user['email_verified_at'])) {
                $db->prepare('UPDATE users SET email_verified_at = NOW(), status = "active" WHERE id = :id')->execute(['id' => $user['id']]);
            }
            $userId = (int) $user['id'];
        } else {
            $db->beginTransaction();
            try {
                $db->prepare(
                    'INSERT INTO users (email, google_id, status, email_verified_at, created_at, updated_at)
                     VALUES (:email, :gid, "active", NOW(), NOW(), NOW())'
                )->execute(['email' => $email, 'gid' => $googleId]);
                $userId = (int) $db->lastInsertId();

                $db->prepare('INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at) VALUES (:uid, :fn, :ln, NOW(), NOW())')
                   ->execute(['uid' => $userId, 'fn' => $firstName, 'ln' => $lastName]);

                $roleRow = $db->query("SELECT id FROM roles WHERE name = 'bride' LIMIT 1")->fetch();
                if ($roleRow) {
                    $db->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)')->execute(['uid' => $userId, 'rid' => $roleRow['id']]);
                }

                $inviteCode = strtoupper(bin2hex(random_bytes(4)));
                $db->prepare('INSERT INTO couples (partner1_user_id, invite_code, created_at, updated_at) VALUES (:uid, :code, NOW(), NOW())')
                   ->execute(['uid' => $userId, 'code' => $inviteCode]);
                $coupleId = (int) $db->lastInsertId();
                $db->prepare('INSERT INTO wedding_plans (couple_id, status, created_at, updated_at) VALUES (:cid, "planning", NOW(), NOW())')
                   ->execute(['cid' => $coupleId]);

                $freePlan = $db->query("SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1")->fetch();
                if ($freePlan) {
                    $db->prepare('INSERT INTO subscriptions (couple_id, subscription_plan_id, status, started_at, created_at, updated_at) VALUES (:cid, :pid, "active", NOW(), NOW(), NOW())')
                       ->execute(['cid' => $coupleId, 'pid' => $freePlan['id']]);
                }

                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                error_log('[Leora Auth] Google signup failed: ' . $e->getMessage());
                throw new RuntimeException('Something went wrong creating your account. Please try again.');
            }
        }

        $db->prepare('UPDATE users SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id')
           ->execute(['ip' => $_SERVER['REMOTE_ADDR'] ?? null, 'id' => $userId]);

        self::establishSession($userId);
        log_activity($userId, 'user.login_google', 'user', $userId);

        $final = $db->prepare('SELECT * FROM users WHERE id = :id');
        $final->execute(['id' => $userId]);
        return $final->fetch();
    }

    // ------------------------------------------------------------------
    // PHONE OTP
    // ------------------------------------------------------------------

    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        // Ethiopian local format "09xxxxxxxx" / "07xxxxxxxx" -> E.164 "+2519xxxxxxxx"
        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = '251' . substr($digits, 1);
        }
        if (!str_starts_with($digits, '+')) {
            $digits = '+' . $digits;
        }
        return $digits;
    }

    private const OTP_MAX_ATTEMPTS = 5;
    private const OTP_TTL_MINUTES = 5;
    private const OTP_RESEND_COOLDOWN_SECONDS = 45;

    public static function requestPhoneOtp(string $rawPhone): void
    {
        $phone = self::normalizePhone($rawPhone);
        if (strlen($phone) < 8) {
            throw new RuntimeException('Please enter a valid phone number.');
        }

        $db = Database::connection();

        // Basic rate limiting so one phone can't be spammed with OTP requests.
        $recent = $db->prepare(
            'SELECT created_at FROM phone_otps WHERE phone = :phone ORDER BY created_at DESC LIMIT 1'
        );
        $recent->execute(['phone' => $phone]);
        $last = $recent->fetch();
        if ($last && (time() - strtotime($last['created_at'])) < self::OTP_RESEND_COOLDOWN_SECONDS) {
            throw new RuntimeException('Please wait a moment before requesting another code.');
        }

        $otp = (string) random_int(100000, 999999);
        $db->prepare(
            'INSERT INTO phone_otps (phone, otp_hash, expires_at, created_at)
             VALUES (:phone, :hash, DATE_ADD(NOW(), INTERVAL ' . self::OTP_TTL_MINUTES . ' MINUTE), NOW())'
        )->execute(['phone' => $phone, 'hash' => password_hash($otp, PASSWORD_BCRYPT)]);

        SmsSender::sendOtp($phone, $otp);
    }

    /**
     * Verifies the OTP and logs the user in, creating a phone-only account
     * on first verification. Returns the user row.
     */
    public static function verifyPhoneOtp(string $rawPhone, string $otp): array
    {
        $phone = self::normalizePhone($rawPhone);
        $db = Database::connection();

        $stmt = $db->prepare(
            'SELECT * FROM phone_otps WHERE phone = :phone AND verified_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute(['phone' => $phone]);
        $row = $stmt->fetch();

        if (!$row) {
            throw new RuntimeException('That code has expired. Please request a new one.');
        }
        if ((int) $row['attempts'] >= self::OTP_MAX_ATTEMPTS) {
            throw new RuntimeException('Too many incorrect attempts. Please request a new code.');
        }
        if (!password_verify($otp, $row['otp_hash'])) {
            $db->prepare('UPDATE phone_otps SET attempts = attempts + 1 WHERE id = :id')->execute(['id' => $row['id']]);
            throw new RuntimeException('That code is incorrect.');
        }

        $db->prepare('UPDATE phone_otps SET verified_at = NOW() WHERE id = :id')->execute(['id' => $row['id']]);

        $userStmt = $db->prepare('SELECT * FROM users WHERE phone = :phone LIMIT 1');
        $userStmt->execute(['phone' => $phone]);
        $user = $userStmt->fetch();

        if ($user) {
            $userId = (int) $user['id'];
            if (empty($user['phone_verified_at'])) {
                $db->prepare('UPDATE users SET phone_verified_at = NOW(), status = "active" WHERE id = :id')->execute(['id' => $userId]);
            }
        } else {
            $db->beginTransaction();
            try {
                $db->prepare(
                    'INSERT INTO users (phone, status, phone_verified_at, created_at, updated_at)
                     VALUES (:phone, "active", NOW(), NOW(), NOW())'
                )->execute(['phone' => $phone]);
                $userId = (int) $db->lastInsertId();

                $db->prepare('INSERT INTO user_profiles (user_id, first_name, created_at, updated_at) VALUES (:uid, "Guest", NOW(), NOW())')
                   ->execute(['uid' => $userId]);

                $roleRow = $db->query("SELECT id FROM roles WHERE name = 'bride' LIMIT 1")->fetch();
                if ($roleRow) {
                    $db->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)')->execute(['uid' => $userId, 'rid' => $roleRow['id']]);
                }

                $inviteCode = strtoupper(bin2hex(random_bytes(4)));
                $db->prepare('INSERT INTO couples (partner1_user_id, invite_code, created_at, updated_at) VALUES (:uid, :code, NOW(), NOW())')
                   ->execute(['uid' => $userId, 'code' => $inviteCode]);
                $coupleId = (int) $db->lastInsertId();
                $db->prepare('INSERT INTO wedding_plans (couple_id, status, created_at, updated_at) VALUES (:cid, "planning", NOW(), NOW())')
                   ->execute(['cid' => $coupleId]);

                $freePlan = $db->query("SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1")->fetch();
                if ($freePlan) {
                    $db->prepare('INSERT INTO subscriptions (couple_id, subscription_plan_id, status, started_at, created_at, updated_at) VALUES (:cid, :pid, "active", NOW(), NOW(), NOW())')
                       ->execute(['cid' => $coupleId, 'pid' => $freePlan['id']]);
                }

                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                error_log('[Leora Auth] Phone signup failed: ' . $e->getMessage());
                throw new RuntimeException('Something went wrong creating your account. Please try again.');
            }
        }

        $db->prepare('UPDATE users SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id')
           ->execute(['ip' => $_SERVER['REMOTE_ADDR'] ?? null, 'id' => $userId]);

        self::establishSession($userId);
        log_activity($userId, 'user.login_phone_otp', 'user', $userId);

        $final = $db->prepare('SELECT * FROM users WHERE id = :id');
        $final->execute(['id' => $userId]);
        return $final->fetch();
    }

    public static function requestPasswordReset(string $email): void
    {
        $email = mb_strtolower(trim($email));
        $db = Database::connection();

        $stmt = $db->prepare('SELECT u.id, p.first_name FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.email = :email AND u.deleted_at IS NULL LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        // Always behave the same whether or not the account exists, so we
        // don't leak account existence via response timing/content.
        if (!$user) {
            return;
        }

        $token = bin2hex(random_bytes(32));
        $db->prepare(
            'INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
             VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())'
        )->execute(['uid' => $user['id'], 'hash' => hash('sha256', $token)]);

        Mailer::sendPasswordResetEmail($email, $user['first_name'] ?? 'there', $token);
    }

    public static function resetPassword(string $token, string $newPassword): bool
    {
        if (strlen($newPassword) < 8) {
            throw new RuntimeException('Password must be at least 8 characters.');
        }

        $db = Database::connection();
        $hash = hash('sha256', $token);

        $stmt = $db->prepare('SELECT * FROM password_resets WHERE token_hash = :hash AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
        $stmt->execute(['hash' => $hash]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }

        $db->prepare('UPDATE users SET password_hash = :h, failed_login_count = 0, locked_until = NULL WHERE id = :id')
           ->execute(['h' => password_hash($newPassword, PASSWORD_BCRYPT), 'id' => $row['user_id']]);
        $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = :id')->execute(['id' => $row['id']]);

        log_activity((int) $row['user_id'], 'user.password_reset', 'user', (int) $row['user_id']);

        return true;
    }
}
