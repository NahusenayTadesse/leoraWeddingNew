import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { checkoutSchema } from '$lib/schemas/checkout';
import { priceCart, createOrder } from '$lib/server/checkout';
import { getCoupleByUserId } from '$lib/server/couples';
import { chapa, encodeCheckoutToken, normalizeEthiopianPhone } from '$lib/server/chapa';
import { addUser, loginSchema } from '$lib/ZodSchema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = locals.user ? await getCoupleByUserId(locals.user.id) : null;

	const [form, signupForm, loginForm] = await Promise.all([
		superValidate(zod4(checkoutSchema)),
		superValidate(zod4(addUser)),
		superValidate(zod4(loginSchema))
	]);

	return {
		form,
		signupForm,
		loginForm,
		user: locals.user ?? null,
		hasCouple: !!couple
	};
};

export const actions: Actions = {
	add: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod4(checkoutSchema));

		if (!locals.user) {
			return message(form, { type: 'error', text: 'Please sign in to place your order.' }, { status: 401 });
		}
		if (!form.valid) return fail(400, { form });

		const couple = await getCoupleByUserId(locals.user.id);
		if (!couple) {
			return message(
				form,
				{ type: 'error', text: 'Add your couple details before ordering.' },
				{ status: 400 }
			);
		}

		const priced = await priceCart(form.data.items);

		if (priced.issues.length > 0) {
			return message(
				form,
				{
					type: 'error',
					text: 'Some items changed. Review your cart and try again.',
					issues: priced.issues
				},
				{ status: 409 }
			);
		}

		if (priced.lines.length === 0) {
			return message(form, { type: 'error', text: 'Your cart is empty.' }, { status: 400 });
		}

		const orderId = await createOrder(couple.id, locals.user.id, priced.lines);

		// The order is saved as 'pending' regardless of what happens next — a
		// failed payment must never look like a lost order.
		try {
			const tx_ref = chapa.genTxRef();
			const token = encodeCheckoutToken(tx_ref, orderId);
			const [firstName, ...rest] = (locals.user.name || 'Guest Customer').trim().split(/\s+/);

			const init = await chapa.initialize({
				amount: priced.total.toFixed(2),
				currency: 'ETB',
				email: locals.user.email,
				first_name: firstName,
				last_name: rest.join(' ') || 'Customer',
				phone_number: normalizeEthiopianPhone(couple.phone),
				tx_ref,
				return_url: `${url.origin}/checkout/confirm/${token}`,
				customization: {
					title: 'Leora Events',
					// Chapa only accepts letters, numbers, hyphens, underscores, spaces
					// and dots here — no '#' or em dash.
					description: `Order ${orderId} - ${priced.lines.length} item${priced.lines.length === 1 ? '' : 's'}`
				}
			});

			if (!init?.data?.checkout_url) {
				throw new Error(init?.message || 'Payment initialization failed');
			}

			return message(form, {
				type: 'success',
				text: 'Redirecting you to Chapa to complete payment…',
				checkoutUrl: init.data.checkout_url
			});
		} catch (err) {
			console.error('Chapa initialize error:', err);
			return message(
				form,
				{
					type: 'error',
					text: `Your order #${orderId} was saved, but payment could not be started. Please try again or contact support.`
				},
				{ status: 502 }
			);
		}
	}
};