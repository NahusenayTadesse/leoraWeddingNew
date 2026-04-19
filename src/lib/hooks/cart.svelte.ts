import { setContext, getContext } from 'svelte';

export type CartItem = {
	productId: number;
	productName: string;
	vendorId: number;
	vendor: string;
	price: number;
	quantity: number;
	amount: number | string;
	image?: string | null;
	category?: string | null;
};

/** Cart state type */
export type CartState = {
	items: CartItem[];
	isOpen: boolean;
};

const CART_STORAGE_KEY = 'leora-wedding';

/** Match both product and its amount variation */
const isSameVariant = (a: CartItem, b: Omit<CartItem, 'quantity'>) =>
	a.productId === b.productId && a.amount === b.amount;

/** Cart state class-based management with localStorage persistence */
class UseCart {
	items: CartItem[] = $state([]);
	isOpen: boolean = $state(false);

	/** Total items count */
	totalItems = $derived(this.items.reduce((sum, item) => sum + item.quantity, 0));

	/** Total price */
	totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

	/** Items grouped by vendor */
	itemsByVendor = $derived(
		this.items.reduce(
			(groups, item) => {
				const key = item.vendorId;
				if (!groups[key]) {
					groups[key] = {
						vendorId: item.vendorId,
						vendor: item.vendor,
						items: [],
						subtotal: 0
					};
				}
				groups[key].items.push(item);
				groups[key].subtotal += item.price * item.quantity;
				return groups;
			},
			{} as Record<
				number,
				{ vendorId: number; vendor: string; items: CartItem[]; subtotal: number }
			>
		)
	);

	/** Unique vendor count */
	vendorCount = $derived(new Set(this.items.map((i) => i.vendorId)).size);

	constructor() {
		this.loadFromStorage();
		$effect(() => {
			this.saveToStorage();
		});
	}

	/** Load cart from localStorage */
	private loadFromStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(CART_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					this.items = parsed;
				}
			}
		} catch (e) {
			console.error('Failed to load cart from localStorage:', e);
		}
	};

	/** Save cart to localStorage */
	private saveToStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
		} catch (e) {
			console.error('Failed to save cart to localStorage:', e);
		}
	};

	/** Toggle cart open/close */
	toggle = () => {
		this.isOpen = !this.isOpen;
	};

	/** Open cart */
	open = () => {
		this.isOpen = true;
	};

	/** Close cart */
	close = () => {
		this.isOpen = false;
	};

	/** Add item to cart — same productId + amount stacks, different amount = new line */
	addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
		const existingIndex = this.items.findIndex((i) => isSameVariant(i, item));
		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += quantity;
		} else {
			this.items = [...this.items, { ...item, quantity }];
		}
	};

	/** Remove a specific variant from cart */
	removeItem = (productId: number, amount: number) => {
		this.items = this.items.filter((item) => !isSameVariant(item, { ...item, productId, amount }));
	};

	/** Remove all items from a specific vendor */
	removeVendor = (vendorId: number) => {
		this.items = this.items.filter((item) => item.vendorId !== vendorId);
	};

	/** Update quantity for a specific variant */
	updateQuantity = (productId: number, amount: number, quantity: number) => {
		if (quantity <= 0) {
			this.removeItem(productId, amount);
			return;
		}
		const index = this.items.findIndex((i) => i.productId === productId && i.amount === amount);
		if (index >= 0) {
			this.items[index].quantity = quantity;
		}
	};

	/** Clear all items from cart */
	clearCart = () => {
		this.items = [];
	};

	/** Get subtotal for a specific vendor */
	getVendorSubtotal = (vendorId: number) => {
		return this.items
			.filter((item) => item.vendorId === vendorId)
			.reduce((sum, item) => sum + item.price * item.quantity, 0);
	};
}

/** Set cart state */
export const setCart = () => setContext('cartState', new UseCart());

/** Use cart state */
export const useCart = () => getContext<ReturnType<typeof setCart>>('cartState');
