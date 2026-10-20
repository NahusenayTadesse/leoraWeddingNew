import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Outgoing mail over SMTP. Configured by `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
 * `MAIL_FROM`. With no `SMTP_HOST` in dev, messages are printed to the console instead, so the
 * reset and verification links can be followed locally without a mail server. In production a
 * missing `SMTP_HOST` is an error: silently dropping a password reset is worse than failing.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
	if (!env.SMTP_HOST) return null;
	if (!transporter) {
		const port = Number(env.SMTP_PORT || 587);
		transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port,
			// 465 is implicit TLS; 587 and 25 upgrade with STARTTLS.
			secure: port === 465,
			auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
		});
	}
	return transporter;
}

export type Mail = { to: string; subject: string; html: string; text: string };

export async function sendEmail(mail: Mail): Promise<void> {
	const transport = getTransporter();
	if (!transport) {
		if (dev) {
			console.info(`\n[email] To: ${mail.to}\n[email] Subject: ${mail.subject}\n${mail.text}\n`);
			return;
		}
		throw new Error('SMTP_HOST is not configured; cannot send email');
	}
	await transport.sendMail({
		from: env.MAIL_FROM || 'Leora Events <no-reply@leoraevents.com>',
		...mail
	});
}

/**
 * Fire-and-forget for notifications (vendor approved, payment confirmed…): a mail server outage
 * must not fail the action that triggered the message. Auth mail awaits `sendEmail` instead.
 */
export function notifyByEmail(mail: Mail): void {
	sendEmail(mail).catch((err) => console.error(`[email] failed to send "${mail.subject}":`, err));
}

const escapeHtml = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * One layout for every message: heading, paragraphs, an optional button. Inline styles only,
 * since mail clients strip `<style>`. Paragraphs are plain text and escaped here.
 */
export function layout(opts: {
	heading: string;
	paragraphs: string[];
	action?: { label: string; url: string };
	footnote?: string;
}): { html: string; text: string } {
	const { heading, paragraphs, action, footnote } = opts;
	const html = `
<div style="max-width:600px;margin:auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #eee;border-radius:8px;overflow:hidden">
  <div style="background:#b8860b;padding:20px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">Leora Events</h1>
  </div>
  <div style="padding:24px;color:#333;line-height:1.5">
    <h2 style="margin-top:0;font-size:18px">${escapeHtml(heading)}</h2>
    ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n    ')}
    ${
			action
				? `<div style="text-align:center;margin:28px 0">
      <a href="${escapeHtml(action.url)}" style="background:#b8860b;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">${escapeHtml(action.label)}</a>
    </div>
    <p style="font-size:13px;color:#666">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#b8860b;word-break:break-all">${escapeHtml(action.url)}</a></p>`
				: ''
		}
    ${footnote ? `<p style="font-size:13px;color:#666">${escapeHtml(footnote)}</p>` : ''}
  </div>
  <div style="background:#f6f6f6;padding:12px;text-align:center;font-size:12px;color:#888">
    © ${new Date().getFullYear()} Leora Events
  </div>
</div>`;
	const text = [
		heading,
		'',
		...paragraphs,
		...(action ? ['', `${action.label}: ${action.url}`] : []),
		...(footnote ? ['', footnote] : [])
	].join('\n');
	return { html, text };
}

export function resetPasswordEmail(to: string, url: string): Mail {
	return {
		to,
		subject: 'Reset your Leora Events password',
		...layout({
			heading: 'Reset your password',
			paragraphs: [
				'We received a request to reset the password for your Leora Events account.',
				'Click the button below to choose a new password. The link expires in one hour.'
			],
			action: { label: 'Reset password', url },
			footnote: "If you didn't ask for this, you can ignore this email. Your password won't change."
		})
	};
}

export function verifyEmailEmail(to: string, url: string): Mail {
	return {
		to,
		subject: 'Confirm your email for Leora Events',
		...layout({
			heading: 'Confirm your email address',
			paragraphs: [
				'Welcome to Leora Events! Please confirm this is your email address to activate your account.'
			],
			action: { label: 'Confirm email', url },
			footnote: "If you didn't create an account, you can ignore this email."
		})
	};
}
