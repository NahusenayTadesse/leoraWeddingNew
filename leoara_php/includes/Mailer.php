<?php
/**
 * includes/Mailer.php
 *
 * Minimal transactional email sender. Uses PHP's built-in mail() by default,
 * which works out of the box on most cPanel shared hosting (it routes
 * through the account's local mail server). If you need SMTP for better
 * deliverability, install PHPMailer via Composer (`composer require
 * phpmailer/phpmailer`) and swap the body of send() to use it — the SMTP_*
 * values are already loaded from .env and ready to use.
 */

declare(strict_types=1);

final class Mailer
{
    public static function send(string $toEmail, string $subject, string $htmlBody): bool
    {
        if (MAIL_DRIVER === 'smtp' && SMTP_HOST !== '') {
            // TODO: wire up PHPMailer here once installed. Falling back to
            // mail() for now so the app still functions without Composer.
            error_log('[Leora Mailer] MAIL_DRIVER=smtp but PHPMailer is not wired up yet; falling back to mail().');
        }

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
        ];

        $sent = @mail($toEmail, $subject, $htmlBody, implode("\r\n", $headers));

        if (!$sent) {
            error_log("[Leora Mailer] Failed to send \"$subject\" to $toEmail");
        }

        return $sent;
    }

    public static function sendVerificationEmail(string $toEmail, string $firstName, string $token): void
    {
        $link = APP_URL . '/verify-email.php?token=' . urlencode($token);
        $html = "<p>Hi {$firstName},</p>
            <p>Welcome to Leora Events. Please confirm your email address to activate your account:</p>
            <p><a href=\"{$link}\" style=\"background:#D4AF37;color:#1a1305;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;\">Verify my email</a></p>
            <p>Or paste this link into your browser: {$link}</p>
            <p>This link expires in 24 hours.</p>";
        self::send($toEmail, 'Verify your Leora Events account', $html);
    }

    public static function sendPasswordResetEmail(string $toEmail, string $firstName, string $token): void
    {
        $link = APP_URL . '/reset-password.php?token=' . urlencode($token);
        $html = "<p>Hi {$firstName},</p>
            <p>We received a request to reset your Leora Events password. Click below to choose a new one:</p>
            <p><a href=\"{$link}\" style=\"background:#D4AF37;color:#1a1305;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;\">Reset my password</a></p>
            <p>Or paste this link into your browser: {$link}</p>
            <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>";
        self::send($toEmail, 'Reset your Leora Events password', $html);
    }
}
