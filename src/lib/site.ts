/**
 * Public contact details and social links, in one place. Empty strings are hidden, so a channel
 * appears on the site only once it is filled in here.
 */
export const SITE = {
	name: 'Leora Events',
	email: 'hello@leoraevents.et',
	vendorEmail: 'vendors@leoraevents.et',
	/** E.164, e.g. '+251911000000'. */
	phone: '',
	/** Digits only for wa.me, e.g. '251911000000'. */
	whatsapp: '',
	address: 'Bole Road, Addis Ababa, Ethiopia',
	social: {
		instagram: '',
		facebook: '',
		tiktok: '',
		telegram: ''
	}
} as const;
