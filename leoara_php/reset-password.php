<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
$token = htmlspecialchars($_GET['token'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Password — Leora Events</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;font-family:'Inter',sans-serif;background:#FBF8F2;color:#1D2430;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{background:#fff;border:1px solid rgba(17,24,39,.09);border-radius:16px;padding:40px;max-width:400px;width:100%;box-shadow:0 12px 32px -12px rgba(17,24,39,.15);}
  h1{font-family:'Plus Jakarta Sans';font-size:20px;font-weight:800;margin:0 0 8px;}
  p{color:#6B6458;font-size:13.5px;line-height:1.5;margin-bottom:20px;}
  label{display:block;font-size:12.5px;font-weight:700;color:#6B6458;margin-bottom:6px;}
  input{width:100%;padding:11px 14px;border-radius:10px;border:1px solid rgba(17,24,39,.09);background:#FBF8F2;font-size:14px;margin-bottom:16px;box-sizing:border-box;}
  button{width:100%;padding:12px;border-radius:10px;border:none;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#D4AF37,#B68D28);color:#1a1305;}
  #msg{font-size:13px;margin-top:12px;}
</style>
</head>
<body>
  <div class="card">
    <h1>Choose a new password</h1>
    <p>Must be at least 8 characters.</p>
    <form id="resetForm">
      <label>New password</label>
      <input type="password" id="newPassword" required minlength="8">
      <button type="submit">Update Password</button>
    </form>
    <div id="msg"></div>
  </div>
<script>
document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const password = document.getElementById('newPassword').value;
  try {
    const res = await fetch('/api/auth/reset-password.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '<?= $token ?>', password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    msg.style.color = '#2e7d32';
    msg.textContent = data.message + ' Redirecting to log in…';
    setTimeout(() => window.location.href = 'leora-events-login.html', 1800);
  } catch (err) {
    msg.style.color = '#c0392b';
    msg.textContent = err.message;
  }
});
</script>
</body>
</html>
