<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';

$token = $_GET['token'] ?? '';
$success = $token ? Auth::verifyEmail((string) $token) : false;
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify Email — Leora Events</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;font-family:'Inter',sans-serif;background:#FBF8F2;color:#1D2430;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{background:#fff;border:1px solid rgba(17,24,39,.09);border-radius:16px;padding:44px;max-width:420px;text-align:center;box-shadow:0 12px 32px -12px rgba(17,24,39,.15);}
  .card .ico{font-size:36px;}
  h1{font-family:'Plus Jakarta Sans';font-size:20px;font-weight:800;margin:14px 0 8px;}
  p{color:#6B6458;font-size:14px;line-height:1.6;}
  .btn{display:inline-block;margin-top:16px;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;background:linear-gradient(135deg,#D4AF37,#B68D28);color:#1a1305;}
</style>
</head>
<body>
  <div class="card">
    <?php if ($success): ?>
      <div class="ico">✅</div>
      <h1>Your email is verified</h1>
      <p>Your Leora Events account is now active. You can log in and start planning your wedding.</p>
      <a class="btn" href="leora-events-login.html">Log In</a>
    <?php else: ?>
      <div class="ico">⚠️</div>
      <h1>This link is invalid or expired</h1>
      <p>Verification links expire after 24 hours. Log in and we'll send you a fresh one, or contact support if the problem continues.</p>
      <a class="btn" href="leora-events-login.html">Back to Log In</a>
    <?php endif; ?>
  </div>
</body>
</html>
