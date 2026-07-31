import { setContext, getContext } from 'svelte';

export type CartItem = {
	productId: number;
	productName: string;
	vendorId: number;
	vendor: string;
	price: number;
	quantity: number;
	/** Package label from `prices.amount`. Always a string — it's varchar in the DB. */
	amount: string;
	image?: string | null;
	category?: string | null;
};

export type VendorGroup = {
	vendorId: number;
	vendor: string;
	items: CartItem[];
	subtotal: number;
};

const CART_STORAGE_KEY = 'leora-wedding';
const MAX_QTY = 999;

/** A line is identified by product + package, so the same service can appear twice. */
const lineKey = (productId: number, amount: string) => `${productId}::${amount}`;

/** Clamps to a whole number in [1, MAX_QTY]. Returns null if it isn't usable. */
function normalizeQty(value: unknown): number | null {
	const n = Math.floor(Number(value));
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.min(n, MAX_QTY);
}

/** Discards anything that doesn't look like a cart item — guards against edited localStorage. */
function sanitize(raw: unknown): CartItem[] {
	if (!Array.isArray(raw)) return [];

	const seen = new Set<string>();

	return raw.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const i = item as Record<string, unknown>;

		const productId = Number(i.productId);
		const vendorId = Number(i.vendorId);
		const price = Number(i.price);
		const quantity = normalizeQty(i.quantity);

		if (!Number.isInteger(productId) || productId <= 0) return [];
		if (!Number.isInteger(vendorId) || vendorId <= 0) return [];
		if (quantity === null) return [];
		if (!Number.isFinite(price) || price < 0) return [];

		const amount = String(i.amount ?? '');

		// Collapse duplicate lines rather than letting two entries share a key.
		const key = lineKey(productId, amount);
		if (seen.has(key)) return [];
		seen.add(key);

		return [
			{
				productId,
				productName: String(i.productName ?? ''),
				vendorId,
				vendor: String(i.vendor ?? ''),
				price,
				quantity,
				amount,
				image: i.image == null ? null : String(i.image),
				category: i.category == null ? null : String(i.category)
			}
		];
	});
}

class UseCart {
	items: CartItem[] = $state([]);
	isOpen = $state(false);
	/** False until localStorage has been read. Render a skeleton while false. */
	ready = $state(false);

	totalItems = $derived(this.items.reduce((sum, i) => sum + i.quantity, 0));
	totalPrice = $derived(this.items.reduce((sum, i) => sum + i.price * i.quantity, 0));

	itemsByVendor = $derived(
		Object.values(
			this.items.reduce<Record<number, VendorGroup>>((groups, item) => {
				groups[item.vendorId] ??= {
					vendorId: item.vendorId,
					vendor: item.vendor,
					items: [],
					subtotal: 0
				};
				groups[item.vendorId].items.push(item);
				groups[item.vendorId].subtotal += item.price * item.quantity;
				return groups;
			}, {})
		)
	);

	vendorCount = $derived(new Set(this.items.map((i) => i.vendorId)).size);

	/** Shape the server expects. */
	lines = $derived(
		this.items.map((i) => ({
			productId: i.productId,
			amount: i.amount,
			quantity: i.quantity
		}))
	);

	constructor() {
		// Persist only after hydration, so we never overwrite storage with an empty SSR cart.
		// NOTE: relies on being constructed during component init (see setCart).
		$effect(() => {
			// Read `items` first so it's tracked even on the early return.
			const snapshot = JSON.stringify(this.items);
			if (!this.ready) return;
			try {
				localStorage.setItem(CART_STORAGE_KEY, snapshot);
			} catch (e) {
				console.error('Failed to save cart:', e);
			}
		});
	}

	/** Call once from the client, in an $effect. */
	hydrate = () => {
		if (this.ready) return;
		try {
			const stored = localStorage.getItem(CART_STORAGE_KEY);
			if (stored) this.items = sanitize(JSON.parse(stored));
		} catch (e) {
			console.error('Failed to load cart:', e);
			this.items = [];
		}
		this.ready = true;
	};

	toggle = () => (this.isOpen = !this.isOpen);
	open = () => (this.isOpen = true);
	close = () => (this.isOpen = false);

	/** Index of the line matching product + package, or -1. */
	#indexOf = (productId: number, amount: string) => {
		const key = lineKey(productId, amount);
		return this.items.findIndex((i) => lineKey(i.productId, i.amount) === key);
	};

	addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
		const qty = normalizeQty(quantity);
		if (qty === null) return;

		const index = this.#indexOf(item.productId, item.amount);

		if (index >= 0) {
			this.items[index].quantity = Math.min(this.items[index].quantity + qty, MAX_QTY);
		} else {
			this.items = [...this.items, { ...item, quantity: qty }];
		}
		this.open();
	};

	removeItem = (productId: number, amount: string) => {
		const key = lineKey(productId, amount);
		this.items = this.items.filter((i) => lineKey(i.productId, i.amount) !== key);
	};

	removeVendor = (vendorId: number) => {
		this.items = this.items.filter((i) => i.vendorId !== vendorId);
	};

	updateQuantity = (productId: number, amount: string, quantity: number) => {
		const qty = normalizeQty(quantity);
		if (qty === null) {
			this.removeItem(productId, amount);
			return;
		}

		const index = this.#indexOf(productId, amount);
		if (index >= 0) this.items[index].quantity = qty;
	};

	clearCart = () => (this.items = []);

	getVendorSubtotal = (vendorId: number) =>
		this.items
			.filter((i) => i.vendorId === vendorId)
			.reduce((sum, i) => sum + i.price * i.quantity, 0);

	/** Applies server-confirmed prices and drops lines the server rejected. */
	reconcile = (
		priced: { productId: number; amount: string; unitPrice: number }[],
		dropped: { productId: number; amount: string }[]
	) => {
		const droppedKeys = new Set(dropped.map((d) => lineKey(d.productId, d.amount)));
		const priceMap = new Map(priced.map((p) => [lineKey(p.productId, p.amount), p.unitPrice]));

		this.items = this.items
			.filter((i) => !droppedKeys.has(lineKey(i.productId, i.amount)))
			.map((i) => {
				const fresh = priceMap.get(lineKey(i.productId, i.amount));
				return fresh === undefined ? i : { ...i, price: fresh };
			});
	};
}

export type { UseCart };

const CART_KEY = Symbol('cart');

/** Must be called at the top level of a component's <script>, not in a handler. */
export const setCart = (): UseCart => setContext(CART_KEY, new UseCart());

export const useCart = (): UseCart => {
	const cart = getContext<UseCart | undefined>(CART_KEY);
	if (!cart) throw new Error('useCart() called without a matching setCart() in a parent component.');
	return cart;
};