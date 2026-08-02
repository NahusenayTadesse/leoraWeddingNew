<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';

$loggedIn = is_logged_in();
$couple = null;
$plan = null;
$data = null;

if ($loggedIn) {
    $couple = current_couple();
    $planSlug = current_plan_slug($couple);
    $db = Database::connection();
    $cid = $couple['id'];

    $weddingPlan = $db->prepare('SELECT * FROM wedding_plans WHERE couple_id = :cid LIMIT 1');
    $weddingPlan->execute(['cid' => $cid]);
    $weddingPlan = $weddingPlan->fetch() ?: [];

    $budget = $db->prepare('SELECT COALESCE(SUM(estimated_cost),0) est, COALESCE(SUM(actual_cost),0) act FROM budget_items WHERE couple_id=:cid AND deleted_at IS NULL');
    $budget->execute(['cid' => $cid]);
    $budget = $budget->fetch();

    $guests = $db->prepare("SELECT COUNT(*) total, SUM(rsvp_status='confirmed') confirmed, SUM(rsvp_status='pending') pending FROM guest_lists WHERE couple_id=:cid AND deleted_at IS NULL");
    $guests->execute(['cid' => $cid]);
    $guests = $guests->fetch();

    $tasks = $db->prepare("SELECT COUNT(*) total, SUM(status='done') done FROM tasks WHERE couple_id=:cid AND deleted_at IS NULL");
    $tasks->execute(['cid' => $cid]);
    $tasks = $tasks->fetch();
    $progressPct = ((int) $tasks['total']) > 0 ? (int) round((int) $tasks['done'] / (int) $tasks['total'] * 100) : 0;

    $upcomingTasks = $db->prepare("SELECT * FROM tasks WHERE couple_id=:cid AND deleted_at IS NULL AND status != 'done' ORDER BY (due_date IS NULL), due_date ASC LIMIT 6");
    $upcomingTasks->execute(['cid' => $cid]);
    $upcomingTasks = $upcomingTasks->fetchAll();

    $savedVendors = $db->prepare('SELECT v.id, v.business_name, v.rating_avg, vc.name category FROM saved_vendors sv JOIN vendors v ON v.id=sv.vendor_id JOIN vendor_categories vc ON vc.id=v.category_id WHERE sv.couple_id=:cid ORDER BY sv.created_at DESC LIMIT 6');
    $savedVendors->execute(['cid' => $cid]);
    $savedVendors = $savedVendors->fetchAll();

    $events = $db->prepare('SELECT * FROM wedding_events WHERE couple_id=:cid AND deleted_at IS NULL ORDER BY sort_order ASC, event_date ASC');
    $events->execute(['cid' => $cid]);
    $events = $events->fetchAll();

    $daysUntil = null;
    if (!empty($weddingPlan['wedding_date'])) {
        $daysUntil = (int) (new DateTime('today'))->diff(new DateTime($weddingPlan['wedding_date']))->format('%r%a') * -1;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $loggedIn ? 'Your Planning Dashboard' : 'Planning Dashboard' ?> — Leora Events</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --gold:#D4AF37; --gold-dark:#B68D28; --gold-soft:rgba(212,175,55,.14);
    --navy:#0B1A2B; --ivory:#FBF8F2; --white:#fff; --text-dark:#1D2430; --text-light:#F3EFE6;
    --bg:var(--ivory); --bg-elevated:var(--white); --text:var(--text-dark); --text-muted:#6B6458;
    --border:rgba(17,24,39,.09); --card-shadow:0 1px 2px rgba(17,24,39,.04),0 12px 32px -12px rgba(17,24,39,.10);
  }
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);}
  .wrap{max-width:1180px;margin:0 auto;padding:0 24px;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border);background:var(--bg-elevated);}
  .brand{font-family:'Plus Jakarta Sans';font-weight:800;font-size:19px;color:var(--text);text-decoration:none;}
  .brand span{color:var(--gold-dark);}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;border:none;text-decoration:none;}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#1a1305;}
  .btn-outline{background:transparent;border:1px solid var(--border);color:var(--text);}
  .eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-dark);}
  .panel{background:var(--bg-elevated);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--card-shadow);}

  /* ---------------- LOGGED-OUT PREVIEW ---------------- */
  .preview-hero{padding:70px 0 40px;text-align:center;}
  .preview-hero h1{font-family:'Plus Jakarta Sans';font-size:36px;font-weight:800;max-width:680px;margin:16px auto 14px;}
  .preview-hero p{max-width:560px;margin:0 auto 26px;color:var(--text-muted);font-size:15.5px;line-height:1.6;}
  .preview-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
  .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin:56px 0 80px;}
  .feature-card{padding:26px;text-align:left;}
  .feature-card .ico{font-size:26px;margin-bottom:12px;}
  .feature-card h3{font-family:'Plus Jakarta Sans';font-size:15.5px;font-weight:800;margin:0 0 6px;}
  .feature-card p{font-size:13px;color:var(--text-muted);margin:0;line-height:1.5;}

  /* ---------------- LOGGED-IN DASHBOARD ---------------- */
  .page-head{padding:32px 0 8px;}
  .page-head h1{font-family:'Plus Jakarta Sans';font-size:26px;font-weight:800;margin:8px 0 4px;}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0;}
  .stat-card b{display:block;font-family:'Plus Jakarta Sans';font-size:26px;font-weight:800;}
  .stat-card span{font-size:12.5px;color:var(--text-muted);}
  .progress-bar{height:8px;border-radius:6px;background:var(--gold-soft);overflow:hidden;margin-top:10px;}
  .progress-bar i{display:block;height:100%;background:linear-gradient(135deg,var(--gold),var(--gold-dark));}
  .content-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin:24px 0 60px;}
  @media (max-width:900px){.content-grid{grid-template-columns:1fr;}}
  .section-title{font-family:'Plus Jakarta Sans';font-size:15px;font-weight:800;margin-bottom:14px;}
  .task-row,.vendor-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13.5px;}
  .task-row:last-child,.vendor-row:last-child{border-bottom:none;}
  .badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--gold-soft);color:var(--gold-dark);}
  .empty-state{padding:30px 10px;text-align:center;color:var(--text-muted);font-size:13.5px;}
  .events-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}
  .event-chip{background:var(--gold-soft);color:var(--gold-dark);font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px;}
</style>
</head>
<body>

<div class="topbar">
  <a href="leora-events-homepage.html" class="brand">Leora <span>Events</span></a>
  <?php if ($loggedIn): ?>
    <button class="btn btn-outline" onclick="Leora.logout()">Log Out</button>
  <?php else: ?>
    <div style="display:flex;gap:10px;">
      <a class="btn btn-outline" href="leora-events-login.html">Log In</a>
      <a class="btn btn-gold" href="leora-events-login.html?mode=signup">Register</a>
    </div>
  <?php endif; ?>
</div>

<?php if (!$loggedIn): ?>
  <!-- ================= LOGGED-OUT PREVIEW — no sample data ================= -->
  <div class="wrap">
    <div class="preview-hero">
      <span class="eyebrow">Planning Dashboard</span>
      <h1>Your personalized planning dashboard is waiting.</h1>
      <p>Sign in to save your wedding plans, track your budget, manage guests, collaborate with your partner, and get a real countdown, checklist and progress view built entirely around your wedding.</p>
      <div class="preview-cta">
        <a class="btn btn-gold" href="leora-events-login.html?mode=signup">Create Your Free Account</a>
        <a class="btn btn-outline" href="leora-events-login.html">Log In</a>
      </div>
    </div>

    <div class="feature-grid">
      <div class="panel feature-card"><div class="ico">📅</div><h3>Wedding Timeline</h3><p>Engagement, Shimgelegna, Gebez/Enshoshela, Ceremony, Melse and Kilikil — all mapped and dated.</p></div>
      <div class="panel feature-card"><div class="ico">✅</div><h3>Checklist &amp; Progress</h3><p>A living checklist that turns into a real progress percentage as you complete tasks.</p></div>
      <div class="panel feature-card"><div class="ico">💰</div><h3>Budget Tracking</h3><p>Estimated vs. actual spend by category, updated the moment you book a vendor.</p></div>
      <div class="panel feature-card"><div class="ico">👥</div><h3>Guest Management</h3><p>RSVP status, plus-ones and meal preferences in one place.</p></div>
      <div class="panel feature-card"><div class="ico">🤝</div><h3>Vendor Management</h3><p>Save, compare and message vendors, and track who's booked.</p></div>
      <div class="panel feature-card"><div class="ico">🔔</div><h3>Reminders &amp; Collaboration</h3><p>Task reminders and a shared workspace for you and your partner.</p></div>
    </div>
  </div>

<?php else: ?>
  <!-- ================= LOGGED-IN — real data for this couple only ================= -->
  <div class="wrap">
    <div class="page-head">
      <span class="eyebrow">Planning Dashboard</span>
      <h1>Your Wedding Workspace</h1>
      <p style="color:var(--text-muted);font-size:13.5px;">
        <?= $daysUntil !== null ? ($daysUntil >= 0 ? "$daysUntil days until your wedding" : "Your wedding day has passed — congratulations!") : 'Set your wedding date in Settings to start your countdown.' ?>
      </p>
    </div>

    <div class="stat-grid">
      <div class="panel stat-card"><b><?= $progressPct ?>%</b><span>Planning progress</span><div class="progress-bar"><i style="width:<?= $progressPct ?>%;"></i></div></div>
      <div class="panel stat-card"><b>ETB <?= number_format((float) $budget['act']) ?></b><span>Spent of ETB <?= number_format((float) $budget['est']) ?> estimated</span></div>
      <div class="panel stat-card"><b><?= (int) $guests['confirmed'] ?> / <?= (int) $guests['total'] ?></b><span>Guests confirmed</span></div>
      <div class="panel stat-card"><b><?= (int) $tasks['done'] ?> / <?= (int) $tasks['total'] ?></b><span>Tasks completed</span></div>
    </div>

    <div class="content-grid">
      <div>
        <div class="panel" style="margin-bottom:20px;">
          <div class="section-title">Upcoming Tasks</div>
          <?php if (!$upcomingTasks): ?>
            <div class="empty-state">No tasks yet. <a href="budget-estimator.php">Start planning</a> to generate your checklist.</div>
          <?php else: foreach ($upcomingTasks as $t): ?>
            <div class="task-row">
              <span><?= htmlspecialchars($t['title']) ?></span>
              <span class="badge"><?= $t['due_date'] ? htmlspecialchars($t['due_date']) : ucfirst($t['priority']) ?></span>
            </div>
          <?php endforeach; endif; ?>
        </div>

        <div class="panel">
          <div class="section-title">Wedding Events Timeline</div>
          <?php if (!$events): ?>
            <div class="empty-state">No events scheduled yet. Add your Engagement, Shimgelegna, Gebez/Enshoshela, Ceremony, Melse and Kilikil dates to build your timeline.</div>
          <?php else: ?>
            <div class="events-strip">
              <?php foreach ($events as $e): ?>
                <span class="event-chip"><?= htmlspecialchars($e['event_name']) ?><?= $e['event_date'] ? ' · ' . date('M j', strtotime($e['event_date'])) : '' ?></span>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom:20px;">
          <div class="section-title">Saved Vendors</div>
          <?php if (!$savedVendors): ?>
            <div class="empty-state">No vendors saved yet. <a href="leora-events-marketplace.html">Browse the marketplace</a>.</div>
          <?php else: foreach ($savedVendors as $v): ?>
            <div class="vendor-row">
              <span><?= htmlspecialchars($v['business_name']) ?></span>
              <span class="badge">★ <?= number_format((float) $v['rating_avg'], 1) ?></span>
            </div>
          <?php endforeach; endif; ?>
        </div>

        <div class="panel">
          <div class="section-title">Your Plan</div>
          <p style="font-size:13px;color:var(--text-muted);">You're on the <b style="color:var(--text);text-transform:capitalize;"><?= htmlspecialchars($planSlug) ?></b> plan.</p>
          <?php if ($planSlug === 'free'): ?>
            <a class="btn btn-gold" style="width:100%;justify-content:center;margin-top:6px;" href="leora-events-pricing.html">Upgrade for unlimited tools</a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
<?php endif; ?>

<script src="assets/js/auth.js"></script>
</body>
</html>
