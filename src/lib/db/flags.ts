import type { TerkaDb } from "./schema";

const NOTIFIED = "notified:";
const NOTE_OFFER = "noteOffer:";

export async function readFlags(
	db: TerkaDb
): Promise<{ notified: Set<string>; noteOffers: Map<string, number[]> }> {
	const notified = new Set<string>();
	const noteOffers = new Map<string, number[]>();
	for (const row of await db.ui_flags.toArray()) {
		if (row.key.startsWith(NOTIFIED)) notified.add(row.key.slice(NOTIFIED.length));
		if (row.key.startsWith(NOTE_OFFER))
			noteOffers.set(row.key.slice(NOTE_OFFER.length), row.value as number[]);
	}
	return { notified, noteOffers };
}

export async function markNotified(db: TerkaDb, keys: string[]): Promise<void> {
	await db.ui_flags.bulkPut(keys.map((key) => ({ key: NOTIFIED + key, value: true })));
}

export async function markNoteOffer(db: TerkaDb, contentId: string, lapses: number): Promise<void> {
	await db.transaction("rw", db.ui_flags, async () => {
		const key = NOTE_OFFER + contentId;
		const offered = ((await db.ui_flags.get(key))?.value as number[] | undefined) ?? [];
		if (!offered.includes(lapses)) await db.ui_flags.put({ key, value: [...offered, lapses] });
	});
}
