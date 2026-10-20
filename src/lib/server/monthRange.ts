/** `?month=YYYY-MM` (or today's month) as the first and last calendar day, `YYYY-MM-DD`. */
export function monthRange(param: string | null): { month: string; from: string; to: string } {
	const now = new Date();
	const match = param?.match(/^(\d{4})-(\d{2})/);
	const y = match ? Number(match[1]) : now.getFullYear();
	const mo = match ? Math.min(12, Math.max(1, Number(match[2]))) : now.getMonth() + 1;
	const pad = (n: number) => String(n).padStart(2, '0');
	const last = new Date(y, mo, 0).getDate();
	return {
		month: `${y}-${pad(mo)}-01`,
		from: `${y}-${pad(mo)}-01`,
		to: `${y}-${pad(mo)}-${pad(last)}`
	};
}
