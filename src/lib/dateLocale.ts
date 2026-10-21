import { getLocale } from '$lib/paraglide/runtime.js';

/** The locale Gregorian dates are written in: Amharic month names for the Amharic interface. */
export const dateLocale = () => (getLocale() === 'am' ? 'am-ET' : 'en-GB');
