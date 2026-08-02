<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
require_login_page('/leora-events-login.html');

$db = Database::connection();
$planSlug = sanitize_str($_GET['plan'] ?? 'golden', 20);
$stmt = $db->prepare('SELECT * FROM subscription_plans WHERE slug = :slug AND is_active = 1 LIMIT 1');
$stmt->execute(['slug' => $planSlug]);
$plan = $stmt->fetch();
if (!$plan) {
    $planSlug = 'golden';
    $stmt->execute(['slug' => 'golden']);
    $plan = $stmt->fetch();
}
$features = $plan['features'] ? json_decode($plan['features'], true) : [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Checkout — Leora Events</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --gold:#D4AF37; --gold-dark:#B68D28; --gold-soft: rgba(212,175,55,0.14);
    --royal:#0B1F3A; --navy:#081626; --surface-dark:#0E1728;
    --ivory:#FAF7F2; --white:#FFFFFF; --text-dark:#111827; --text-light:#F8FAFC;
    --bg: var(--ivory); --bg-elevated: var(--white); --text: var(--text-dark);
    --text-muted: #6B6458; --border: rgba(17,24,39,0.08);
    --card-shadow: 0 1px 2px rgba(17,24,39,0.04), 0 12px 32px -12px rgba(17,24,39,0.10);
    --good:#3E7A4E;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;}
  h1,h2,h3{font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.02em;margin:0;}
  p{margin:0;color:var(--text-muted);line-height:1.6;}
  a{color:inherit;text-decoration:none;}
  header{position:sticky;top:0;z-index:50;background:var(--bg);border-bottom:1px solid var(--border);}
  nav{max-width:1180px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;}
  .brand{display:flex;align-items:center;gap:10px;}
  .brand .mono{width:38px;height:38px;border-radius:10px;background:linear-gradient(160deg,var(--royal),var(--navy));display:flex;align-items:center;justify-content:center;color:var(--gold);font-family:'Plus Jakarta Sans';font-weight:800;font-size:18px;}
  .brand span{font-family:'Plus Jakarta Sans';font-weight:800;font-size:18px;}
  .brand small{display:block;font-size:9px;letter-spacing:.12em;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-top:1px;}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:none;}
  .btn-gold{background:var(--gold);color:#1a1204;}
  .btn-gold:hover{background:var(--gold-dark);}
  .btn-block{width:100%;}
  main{max-width:1000px;margin:0 auto;padding:44px 20px 90px;}
  .grid{display:grid;grid-template-columns:1.15fr 0.85fr;gap:28px;align-items:start;}
  @media (max-width:820px){.grid{grid-template-columns:1fr;}}
  .card{background:var(--bg-elevated);border:1px solid var(--border);border-radius:18px;box-shadow:var(--card-shadow);padding:28px 26px;}
  .card h2{font-size:19px;margin-bottom:18px;}
  .field{margin-bottom:16px;}
  .field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;}
  .field input, .field select{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:'Inter';font-size:14px;outline:none;}
  .pay-methods{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
  .pay-method{flex:1;min-width:110px;border:1px solid var(--border);border-radius:12px;padding:12px 10px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;}
  .pay-method.selected{border-color:var(--gold);background:var(--gold-soft);color:var(--gold-dark);}
  .summary-line{display:flex;justify-content:space-between;padding:9px 0;font-size:14px;}
  .summary-line.total{border-top:1px solid var(--border);margin-top:8px;padding-top:14px;font-weight:800;font-size:16px;font-family:'Plus Jakarta Sans';}
  .plan-badge{display:inline-block;background:var(--gold-soft);color:var(--gold-dark);font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:10px;}
  .secure-note{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-top:16px;color:var(--text-muted);}
  .success-view{text-align:center;padding:40px 10px;}
  .success-view .circle-check{width:70px;height:70px;border-radius:50%;background:var(--gold-soft);color:var(--gold-dark);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;}
  #payMsg{font-size:13px;margin-top:12px;}
</style>
</head>
<body>

<header>
  <nav>
    <a class="brand" href="leora-events-homepage.html">
      <div class="mono">L</div>
      <div><span>Leora Events</span><small>Secure Checkout</small></div>
    </a>
  </nav>
</header>

<main>
  <div id="checkoutView">
    <h1 style="font-size:26px;margin-bottom:24px;">Complete your purchase</h1>
    <div class="grid">
      <div class="card">
        <h2>Payment Details</h2>
        <p style="font-size:12.5px;margin-bottom:16px;">Demo checkout — no live payment gateway is connected yet. See the code comments in <code>api/billing/checkout.php</code> for where to wire in Telebirr / CBE Birr / Chapa.</p>
        <div class="pay-methods" id="payMethods">
          <div class="pay-method selected" data-m="telebirr">Telebirr</div>
          <div class="pay-method" data-m="cbe">CBE Birr</div>
          <div class="pay-method" data-m="card">Debit / Credit Card</div>
        </div>

        <div class="field">
          <label>Coupon code</label>
          <div style="display:flex;gap:10px;">
            <input type="text" id="couponInput" placeholder="Enter coupon code" style="flex:1;">
            <button type="button" class="btn btn-gold" id="couponApplyBtn" style="white-space:nowrap;">Apply</button>
          </div>
          <div id="couponMsg" style="font-size:12.5px;margin-top:6px;"></div>
        </div>

        <button class="btn btn-gold btn-block" id="payBtn">Pay Now</button>
        <div id="payMsg"></div>
        <div class="secure-note">🔒 Payments are recorded against your account and tied to your login.</div>
      </div>

      <div class="card">
        <span class="plan-badge"><?= htmlspecialchars(ucfirst($planSlug)) ?> Plan</span>
        <h2 style="margin-bottom:4px;"><?= htmlspecialchars($plan['name']) ?> — Couple Plan</h2>
        <ul style="font-size:13px;margin:10px 0 18px;padding-left:18px;color:var(--text-muted);">
          <?php foreach ($features as $f): ?><li><?= htmlspecialchars($f) ?></li><?php endforeach; ?>
        </ul>
        <div class="summary-line"><span>Subtotal</span><span id="sumSubtotal">ETB <?= number_format((float) $plan['price']) ?></span></div>
        <div id="sumDiscountLine"></div>
        <div class="summary-line"><span>VAT (15%)</span><span id="sumVat"></span></div>
        <div class="summary-line total"><span>Total due today</span><span id="sumTotal"></span></div>
      </div>
    </div>
  </div>

  <div id="successView" style="display:none;">
    <div class="card success-view">
      <div class="circle-check">✓</div>
      <h2 style="margin-bottom:8px;">Payment successful</h2>
      <p id="successMsg">Your plan is now active.</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">
        <a class="btn btn-gold" href="dashboard.php">Go to Dashboard</a>
      </div>
    </div>
  </div>
</main>

<script src="assets/js/auth.js"></script>
<script>
  const planPrice = <?= (float) $plan['price'] ?>;
  const planSlug = '<?= htmlspecialchars($planSlug) ?>';
  let discount = 0, appliedCode = null;

  function recalc(){
    const discountedSubtotal = Math.max(0, planPrice - discount);
    const vat = Math.round(discountedSubtotal * 0.15);
    document.getElementById('sumVat').textContent = `ETB ${vat.toLocaleString()}`;
    document.getElementById('sumTotal').textContent = `ETB ${(discountedSubtotal+vat).toLocaleString()}`;
    const line = document.getElementById('sumDiscountLine');
    line.innerHTML = discount > 0
      ? `<div class="summary-line"><span>Coupon (${appliedCode})</span><span>- ETB ${discount.toLocaleString()}</span></div>`
      : '';
  }
  recalc();

  (async () => { await Leora.checkAuth().catch(()=>{}); })();

  document.getElementById('couponApplyBtn').addEventListener('click', async () => {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    const msg = document.getElementById('couponMsg');
    if (!code) { msg.textContent = 'Enter a coupon code first.'; msg.style.color = 'var(--text-muted)'; return; }
    try {
      const res = await Leora.api('/api/billing/validate-coupon.php', { method:'POST', body:{ code, plan_slug: planSlug } });
      discount = res.coupon.discount_amount;
      appliedCode = res.coupon.code;
      msg.textContent = `Applied: ${res.coupon.label}`;
      msg.style.color = 'var(--good)';
      recalc();
    } catch(e) {
      discount = 0; appliedCode = null;
      msg.textContent = e.data?.error || 'That coupon code is not valid.';
      msg.style.color = '#c0392b';
      recalc();
    }
  });

  document.querySelectorAll('.pay-method').forEach(m=>{
    m.addEventListener('click', ()=>{
      document.querySelectorAll('.pay-method').forEach(x=>x.classList.remove('selected'));
      m.classList.add('selected');
    });
  });

  document.getElementById('payBtn').addEventListener('click', async () => {
    const btn = document.getElementById('payBtn');
    const msg = document.getElementById('payMsg');
    const method = document.querySelector('.pay-method.selected').dataset.m;
    btn.disabled = true; btn.textContent = 'Processing…';
    try {
      const res = await Leora.api('/api/billing/checkout.php', {
        method: 'POST',
        body: { plan_slug: planSlug, coupon_code: appliedCode || '', payment_method: method }
      });
      document.getElementById('checkoutView').style.display = 'none';
      document.getElementById('successView').style.display = 'block';
      document.getElementById('successMsg').textContent = `Your ${planSlug} plan is now active. Total paid: ETB ${Number(res.total_paid).toLocaleString()}.`;
    } catch(e) {
      msg.style.color = '#c0392b';
      msg.textContent = e.data?.error || 'Payment could not be processed. Please try again.';
      btn.disabled = false; btn.textContent = 'Pay Now';
    }
  });
</script>
</body>
</html>
