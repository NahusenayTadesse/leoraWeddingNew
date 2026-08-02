<?php
declare(strict_types=1);
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

Auth::logout();
json_response(['success' => true]);
