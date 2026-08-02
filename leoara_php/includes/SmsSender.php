<?php
/**
 * includes/SmsSender.php
 *
 * Sends the OTP text message. cPanel shared hosting has no built-in SMS
 * capability (unlike email's mail()), so this needs a real gateway before
 * go-live. Two drivers are supported:
 *
 *   SMS_DRIVER=log   — writes the OTP to the PHP error log instead of
 *                       sending a real text. Safe default for development;
 *                       DO NOT ship this to production.
 *   SMS_DRIVER=http   — posts to any REST-style SMS gateway (AfroMessage,
 *                       GeezSMS, Twilio, etc). Adjust buildHttpRequest()
 *                       below to match your chosen provider's exact API —
 *                       every provider's request shape is a little different,
 *                       so this is a template, not a finished integration.
 */

declare(strict_types=1);

final class SmsSender
{
    public static function sendOtp(string $phone, string $otp): bool
    {
        $message = "Your Leora Events verification code is {$otp}. It expires in 5 minutes.";

        if (SMS_DRIVER === 'log' || SMS_API_URL === '') {
            error_log("[Leora SMS - DEV MODE] To: {$phone} | Message: {$message}");
            return true;
        }

        return self::sendHttp($phone, $message);
    }

    private static function sendHttp(string $phone, string $message): bool
    {
        // ---- TEMPLATE: adjust the payload shape to match your SMS provider ----
        $payload = [
            'from' => SMS_SENDER_ID,
            'to' => $phone,
            'message' => $message,
        ];

        $ch = curl_init(SMS_API_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . SMS_API_KEY,
            ],
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error || $httpCode >= 300) {
            error_log("[Leora SMS] Failed to send to {$phone}: HTTP {$httpCode} {$error} {$response}");
            return false;
        }

        return true;
    }
}
