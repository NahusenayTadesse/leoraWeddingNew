import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { checkoutSchema } from '$lib/schemas/checkout';
import { priceCart, createOrder } from '$lib/server/checkout';
import { getCoupleByUserId } from '$lib/server/couples';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = locals.user ? await getCoupleByUserId(locals.user.id) : null;

	const form = await superValidate(zod4(checkoutSchema));

	// Keep your existing signupForm / loginForm lines here.
	return {
		form,
		user: locals.user ?? null,
		hasCouple: !!couple
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
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

		return message(form, {
			type: 'success',
			text: 'Order placed. The vendors will confirm shortly.',
			orderId
		});
	}
};