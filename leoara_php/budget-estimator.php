<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
$loggedIn = is_logged_in();
$planSlug = 'free';
if ($loggedIn) {
    $couple = current_couple();
    $planSlug = current_plan_slug($couple);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Budget Estimator — Leora Events</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --gold:#D4AF37; --gold-dark:#B68D28; --gold-soft:rgba(212,175,55,.14);
    --bg:#FBF8F2; --bg-elevated:#fff; --text:#1D2430; --text-muted:#6B6458;
    --border:rgba(17,24,39,.09); --card-shadow:0 1px 2px rgba(17,24,39,.04),0 12px 32px -12px rgba(17,24,39,.10);
    --good:#2e7d32; --bad:#c0392b;
  }
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);}
  .wrap{max-width:1080px;margin:0 auto;padding:0 24px;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border);background:var(--bg-elevated);}
  .brand{font-family:'Plus Jakarta Sans';font-weight:800;font-size:19px;color:var(--text);text-decoration:none;}
  .brand span{color:var(--gold-dark);}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;border:none;text-decoration:none;}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#1a1305;}
  .btn-outline{background:transparent;border:1px solid var(--border);color:var(--text);}
  .eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-dark);}
  .panel{background:var(--bg-elevated);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--card-shadow);}
  .page-head{padding:36px 0 8px;text-align:center;}
  .page-head h1{font-family:'Plus Jakarta Sans';font-size:30px;font-weight:800;margin:8px 0 6px;}
  .page-head p{color:var(--text-muted);max-width:560px;margin:0 auto;font-size:14.5px;}
  .tabs{display:flex;gap:10px;justify-content:center;margin:28px 0;}
  .tab-btn{padding:10px 20px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);font-weight:700;font-size:13.5px;cursor:pointer;}
  .tab-btn.active{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#1a1305;border-color:transparent;}
  .mode-panel{display:none;margin-bottom:70px;}
  .mode-panel.active{display:block;}
  .field{margin-bottom:14px;}
  .field label{display:block;font-size:12.5px;font-weight:700;margin-bottom:6px;color:var(--text-muted);}
  .field input,.field select{width:100%;padding:11px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg);font-size:14px;color:var(--text);}
  table{width:100%;border-collapse:collapse;font-size:13.5px;}
  th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border);}
  th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);}
  .empty-state{padding:40px 10px;text-align:center;color:var(--text-muted);}
  .locked-banner{background:var(--gold-soft);border-radius:12px;padding:16px 20px;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px;}
  .vendor-pick{display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);}
  .totals-row td{font-weight:800;}
  .msg{font-size:13px;margin-top:10px;}
  .msg.good{color:var(--good);} .msg.bad{color:var(--bad);}
  .add-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;align-items:end;margin-top:16px;}
  @media (max-width:720px){.add-row{grid-template-columns:1fr 1fr;}}
</style>
</head>
<body>

<div class="topbar">
  <a href="leora-events-homepage.html" class="brand">Leora <span>Events</span></a>
  <?php if ($loggedIn): ?>
    <div style="display:flex;gap:10px;align-items:center;">
      <span class="eyebrow" style="text-transform:capitalize;"><?= htmlspecialchars($planSlug) ?> Plan</span>
      <a class="btn btn-outline" href="dashboard.php">Dashboard</a>
      <button class="btn btn-outline" onclick="Leora.logout()">Log Out</button>
    </div>
  <?php else: ?>
    <div style="display:flex;gap:10px;">
      <a class="btn btn-outline" href="leora-events-login.html">Log In</a>
      <a class="btn btn-gold" href="leora-events-login.html?mode=signup">Register</a>
    </div>
  <?php endif; ?>
</div>

<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Budget Estimator</span>
    <h1>Plan your wedding budget with confidence</h1>
    <p>Compare real vendors side by side, or build a personal budget that tracks your estimated vs. actual spend as you book.</p>
  </div>

  <div class="tabs">
    <button class="tab-btn active" data-tab="compare">Mode 1 · Vendor Comparison</button>
    <button class="tab-btn" data-tab="planner">Mode 2 · Custom Budget Planner</button>
  </div>

  <!-- ================= MODE 1: VENDOR COMPARISON ================= -->
  <div class="mode-panel active" id="tab-compare">
    <?php if (!$loggedIn): ?>
      <div class="panel" style="text-align:center;padding:50px 24px;">
        <div style="font-size:30px;">📊</div>
        <h3 style="font-family:'Plus Jakarta Sans';margin:14px 0 8px;">Compare vendors side by side</h3>
        <p style="color:var(--text-muted);font-size:14px;max-width:440px;margin:0 auto 20px;">See price differences, package inclusions, ratings, reviews, location and a computed value score. Free accounts get 3 comparisons; Golden and Platinum get unlimited comparisons of up to 5 vendors.</p>
        <a class="btn btn-gold" href="leora-events-login.html?mode=signup">Create Free Account</a>
      </div>
    <?php else: ?>
      <div class="locked-banner" id="compareLimitBanner" style="display:none;"></div>
      <div class="panel">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">Select vendors to compare (<span id="maxCompareLabel">2</span> max on your plan):</div>
        <div id="vendorPickList"><div class="empty-state">Loading vendors…</div></div>
        <button class="btn btn-gold" id="runCompareBtn" style="margin-top:16px;">Compare Selected</button>
        <div class="msg" id="compareMsg"></div>
      </div>
      <div class="panel" style="margin-top:20px;" id="compareResultsPanel" style="display:none;">
        <div id="compareResults"></div>
      </div>
    <?php endif; ?>
  </div>

  <!-- ================= MODE 2: CUSTOM BUDGET PLANNER ================= -->
  <div class="mode-panel" id="tab-planner">
    <?php if (!$loggedIn): ?>
      <div class="panel" style="text-align:center;padding:50px 24px;">
        <div style="font-size:30px;">💰</div>
        <h3 style="font-family:'Plus Jakarta Sans';margin:14px 0 8px;">Build your own personal budget</h3>
        <p style="color:var(--text-muted);font-size:14px;max-width:440px;margin:0 auto 20px;">Log in to create categories, add real expenses, track estimated vs. actual cost, and see your remaining balance update automatically. Your budget is private — only you and your partner can see it.</p>
        <a class="btn btn-gold" href="leora-events-login.html?mode=signup">Create Free Account</a>
      </div>
    <?php else: ?>
      <div class="panel">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px;">
          <div><span class="eyebrow">Estimated</span><div style="font-family:'Plus Jakarta Sans';font-size:22px;font-weight:800;" id="plannerEstTotal">ETB 0</div></div>
          <div><span class="eyebrow">Actual Spent</span><div style="font-family:'Plus Jakarta Sans';font-size:22px;font-weight:800;" id="plannerActTotal">ETB 0</div></div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Category</th><th>Estimated</th><th>Actual</th><th>Status</th><th></th></tr></thead>
          <tbody id="plannerRows"><tr><td colspan="6" class="empty-state">Loading your budget…</td></tr></tbody>
        </table>

        <div class="add-row">
          <div class="field"><label>Item name</label><input type="text" id="newItemName" placeholder="e.g. Reception venue deposit"></div>
          <div class="field"><label>Category</label><select id="newItemCategory"></select></div>
          <div class="field"><label>Estimated (ETB)</label><input type="number" id="newItemEst" placeholder="0"></div>
          <div class="field"><label>Actual (ETB)</label><input type="number" id="newItemAct" placeholder="0"></div>
          <button class="btn btn-gold" id="addItemBtn">Add</button>
        </div>
        <div class="msg" id="plannerMsg"></div>
      </div>
    <?php endif; ?>
  </div>
</div>

<script src="assets/js/auth.js"></script>
<script>
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  });
});

<?php if ($loggedIn): ?>
const authReady = Leora.checkAuth().catch(()=>{});

(async function initMode1(){
  await authReady;
  let vendors = [];
  try {
    const res = await Leora.api('/api/vendors/list.php');
    vendors = res.vendors || [];
    const maxCompare = <?= $planSlug === 'free' ? 2 : 5 ?>;
    document.getElementById('maxCompareLabel').textContent = maxCompare;
    const list = document.getElementById('vendorPickList');
    if (!vendors.length) {
      list.innerHTML = '<div class="empty-state">No approved vendors in the marketplace yet — check back soon, or browse pending applications in the Vendor Portal.</div>';
    } else {
      list.innerHTML = vendors.map(v => `
        <label class="vendor-pick">
          <input type="checkbox" value="${v.id}" class="vendorCheck">
          <span style="flex:1;">${v.business_name} <span style="color:var(--text-muted);">· ${v.category}${v.city ? ' · '+v.city : ''}</span></span>
          <span>★ ${Number(v.rating_avg).toFixed(1)}</span>
        </label>`).join('');
    }
  } catch(e) {
    document.getElementById('vendorPickList').innerHTML = '<div class="empty-state">Could not load vendors right now.</div>';
  }

  document.getElementById('runCompareBtn').addEventListener('click', async ()=>{
    const ids = Array.from(document.querySelectorAll('.vendorCheck:checked')).map(c => parseInt(c.value));
    const msg = document.getElementById('compareMsg');
    if (!ids.length) { msg.textContent = 'Select at least one vendor.'; msg.className='msg bad'; return; }
    try {
      const res = await Leora.api('/api/vendors/compare.php', { method:'POST', body:{ vendor_ids: ids } });
      msg.textContent = ''; msg.className = 'msg';
      const panel = document.getElementById('compareResultsPanel');
      panel.style.display = 'block';
      document.getElementById('compareResults').innerHTML = `
        <table><thead><tr><th>Vendor</th><th>Category</th><th>Price Range</th><th>Rating</th><th>Value Score</th></tr></thead>
        <tbody>${res.vendors.map(v => `<tr${v.id===res.recommended_id?' style="background:var(--gold-soft);"':''}>
          <td>${v.business_name}${v.id===res.recommended_id?' <span class="badge">Recommended</span>':''}</td>
          <td>${v.category}</td>
          <td>ETB ${Number(v.price_min).toLocaleString()}–${Number(v.price_max).toLocaleString()}</td>
          <td>★ ${Number(v.rating_avg).toFixed(1)} (${v.review_count})</td>
          <td>${v.value_score}/100</td>
        </tr>`).join('')}</tbody></table>`;
    } catch(e) {
      msg.textContent = e.data?.error || e.message;
      msg.className = 'msg bad';
      if (e.data?.upgrade_required) {
        document.getElementById('compareLimitBanner').style.display='flex';
        document.getElementById('compareLimitBanner').innerHTML = `<span>${e.data.error}</span><a class="btn btn-gold" href="leora-events-pricing.html">Upgrade to Golden</a>`;
      }
    }
  });
})();

(async function initMode2(){
  await authReady;
  let categories = [];
  try {
    const catRes = await Leora.api('/api/budget/categories.php');
    categories = catRes.categories || [];
    document.getElementById('newItemCategory').innerHTML = categories.map(c => `<option value="${c.id}">${c.icon||''} ${c.name}</option>`).join('');
  } catch(e){}

  async function loadItems(){
    const res = await Leora.api('/api/budget/items.php');
    const rows = document.getElementById('plannerRows');
    if (!res.items.length) {
      rows.innerHTML = '<tr><td colspan="6" class="empty-state">No budget items yet — add your first expense below.</td></tr>';
    } else {
      rows.innerHTML = res.items.map(it => `
        <tr>
          <td>${it.name}</td>
          <td>${it.category_icon||''} ${it.category_name}</td>
          <td>ETB ${Number(it.estimated_cost).toLocaleString()}</td>
          <td>ETB ${Number(it.actual_cost).toLocaleString()}</td>
          <td style="text-transform:capitalize;">${it.status}</td>
          <td><button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick="deleteBudgetItem(${it.id})">Remove</button></td>
        </tr>`).join('');
    }
    document.getElementById('plannerEstTotal').textContent = 'ETB ' + Number(res.totals.estimated).toLocaleString();
    document.getElementById('plannerActTotal').textContent = 'ETB ' + Number(res.totals.actual).toLocaleString();
  }
  loadItems();

  window.deleteBudgetItem = async function(id){
    await Leora.api('/api/budget/items.php?id=' + id, { method:'DELETE' });
    loadItems();
  };

  document.getElementById('addItemBtn').addEventListener('click', async ()=>{
    const name = document.getElementById('newItemName').value.trim();
    const categoryId = parseInt(document.getElementById('newItemCategory').value);
    const est = parseFloat(document.getElementById('newItemEst').value) || 0;
    const act = parseFloat(document.getElementById('newItemAct').value) || 0;
    const msg = document.getElementById('plannerMsg');
    if (!name || !categoryId) { msg.textContent = 'Enter an item name and choose a category.'; msg.className='msg bad'; return; }
    try {
      await Leora.api('/api/budget/items.php', { method:'POST', body:{ name, budget_category_id: categoryId, estimated_cost: est, actual_cost: act } });
      document.getElementById('newItemName').value='';
      document.getElementById('newItemEst').value='';
      document.getElementById('newItemAct').value='';
      msg.textContent = 'Added.'; msg.className='msg good';
      loadItems();
    } catch(e) {
      msg.textContent = e.data?.error || e.message; msg.className='msg bad';
    }
  });
})();
<?php endif; ?>
</script>
</body>
</html>
