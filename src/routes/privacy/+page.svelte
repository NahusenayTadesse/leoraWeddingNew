<script lang="ts">
	import LegalPage from '$lib/components/legal-page.svelte';
</script>

<svelte:head>
	<title>Privacy Policy — Leora Events</title>
</svelte:head>

<LegalPage title="Privacy Policy" updated="July 1, 2026">
	<h2>1. What We Collect</h2>
	<div class="overflow-x-auto">
		<table>
			<thead>
				<tr><th>Category</th><th>Examples</th></tr>
			</thead>
			<tbody>
				<tr><td>Account info</td><td>Name, email, phone number, password</td></tr>
				<tr><td>Wedding details</td><td>Date, guest count, budget, saved vendors</td></tr>
				<tr><td>Vendor info</td><td>Business name, category, portfolio, pricing</td></tr>
				<tr>
					<td>Payment info</td>
					<td>
						Payment method type and transaction history (processed via secure third-party
						providers)
					</td>
				</tr>
				<tr><td>Usage data</td><td>Pages visited, searches, device and browser type</td></tr>
			</tbody>
		</table>
	</div>

	<h2>2. How We Use Your Information</h2>
	<ul>
		<li>To operate core features like matching couples with vendors and processing bookings</li>
		<li>To send booking confirmations, messages, and account notifications</li>
		<li>To improve search relevance and platform performance</li>
		<li>To detect fraud and enforce our <a href="/terms">Terms of Service</a></li>
	</ul>

	<h2>3. What We Share</h2>
	<p>
		When you send a booking request, we share relevant wedding details (date, guest count, budget
		range) with that vendor. We do not sell personal data to third parties. We may share data with
		payment processors, cloud hosting providers, and analytics tools strictly to operate the
		service.
	</p>

	<h2>4. Data Retention</h2>
	<p>
		We retain account data for as long as your account is active. If you delete your account, we
		remove personal data within 30 days, except where retention is required for legal or accounting
		purposes — payment and commission records are kept for tax and reconciliation.
	</p>

	<h2>5. Your Rights</h2>
	<ul>
		<li>Access, correct, or export your personal data from <a href="/account">Account Settings</a></li>
		<li>Request account deletion at any time</li>
		<li>Opt out of marketing emails while still receiving essential account notifications</li>
	</ul>

	<h2>6. Cookies</h2>
	<p>
		We use cookies to keep you logged in, remember preferences like light/dark mode, and understand
		how the platform is used. You can control cookies through your browser settings.
	</p>

	<h2>7. Security</h2>
	<p>
		We use industry-standard encryption for data in transit and at rest, and payment details are
		handled by PCI-compliant payment processors — Leora Events does not store full card numbers.
	</p>

	<h2>8. Children's Privacy</h2>
	<p>
		Leora Events is not directed at anyone under 18, and we do not knowingly collect data from
		minors.
	</p>

	<h2>9. Contact Us</h2>
	<p>
		For privacy questions or data requests, reach out via our <a href="/contact-us">Contact page</a>.
	</p>
</LegalPage>
