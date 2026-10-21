import { beforeEach, describe, expect, it } from 'vitest';
import {
	boardByToken,
	createBoard,
	listBoards,
	removeItem,
	saveItem,
	shareBoard
} from '$lib/server/boards';
import { makeCoupleWithWedding, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);

describe('inspiration boards', () => {
	it('the first save makes a board; saving twice keeps one copy', async () => {
		const { coupleId } = await makeCoupleWithWedding();
		expect(await saveItem(coupleId, { image: 'a.jpg' }, 'Favourites')).toBe(true);
		expect(await saveItem(coupleId, { image: 'a.jpg' }, 'Favourites')).toBe(true);
		const boards = await listBoards(coupleId);
		expect(boards.map((b) => [b.name, b.items.length])).toEqual([['Favourites', 1]]);
	});

	it("a couple can't touch another couple's board", async () => {
		const a = await makeCoupleWithWedding();
		const b = await makeCoupleWithWedding();
		const boardId = (await createBoard(a.coupleId, 'Decor'))!;
		await saveItem(a.coupleId, { boardId, image: 'x.jpg' }, 'F');
		const [item] = (await listBoards(a.coupleId))[0].items;

		expect(await saveItem(b.coupleId, { boardId, image: 'y.jpg' }, 'F')).toBe(false);
		expect(await removeItem(b.coupleId, item.id)).toBe(false);
		expect(await shareBoard(b.coupleId, boardId)).toBeNull();
	});

	it('a shared board opens read-only by its token', async () => {
		const { coupleId } = await makeCoupleWithWedding();
		const boardId = (await createBoard(coupleId, 'Habesha kemis'))!;
		await saveItem(coupleId, { boardId, image: 'k.jpg', note: 'This one' }, 'F');
		const token = (await shareBoard(coupleId, boardId))!;
		expect(await shareBoard(coupleId, boardId)).toBe(token);
		expect(await boardByToken(token)).toMatchObject({
			name: 'Habesha kemis',
			items: [{ image: 'k.jpg', note: 'This one' }]
		});
		expect(await boardByToken('not-a-real-token')).toBeNull();
	});
});
