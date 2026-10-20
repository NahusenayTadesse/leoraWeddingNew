/*
 * App-only helpers. Ethiopian dates, `formatETB`, `Item`, `selectItem` and the rest of what used
 * to live here now come from `@nahu/admin-kit/global`.
 */

export const toastmsg = `fixed right-4 bottom-20 lg:bottom-4 z-50
             flex items-center gap-3
             bg-green-600 text-white font-medium
             px-5 py-3 rounded-xl shadow-lg
             animate-slide-in`;
export const errormsg = `${toastmsg} !bg-red-600`;

export const gender = [
	{ value: 'male', name: 'Male' },
	{ value: 'female', name: 'Female' }
];
