<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

// Only ever return PUBLIC, non-secret values here (client IDs are meant to
// be visible in the browser — never put GOOGLE_CLIENT_SECRET, SMS_API_KEY,
// DB credentials, etc. in this response).
json_response([
    'success' => true,
    'google_client_id' => GOOGLE_CLIENT_ID,
    'google_enabled' => GOOGLE_CLIENT_ID !== '',
]);
