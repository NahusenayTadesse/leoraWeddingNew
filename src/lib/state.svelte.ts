export const authModal = $state({
	open: false,
	type: 'login' as 'login' | 'register'
});

export function openAuth(type: 'login' | 'register' = 'login') {
	authModal.open = true;
	authModal.type = type;
}

export function closeAuth() {
	authModal.open = false;
}
