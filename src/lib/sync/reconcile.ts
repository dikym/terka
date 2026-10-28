import type { SupabaseClient } from "@supabase/supabase-js";
import { readMeta, wipesOf, type TerkaDb } from "@/lib/db/schema";

const DONE = "closesReconciled";
const PAGE = 1000;

/**
 * A round with several session closes used to send the first and drop the rest from the outbox,
 * so those sessions stayed open on the server for every other device. The device that ran them
 * still holds them closed: queue their closes again, once per device and account.
 */
export async function requeueLostCloses(
	db: TerkaDb,
	client: SupabaseClient,
	wipes: number
): Promise<void> {
	if (await readMeta<boolean>(db, DONE)) return;
	const open: string[] = [];
	let after = "";
	for (;;) {
		let query = client
			.from("practice_runs")
			.select("id")
			.is("ended_at", null)
			.order("id")
			.limit(PAGE);
		if (after) query = query.gt("id", after);
		const response = await query.retry(false);
		if (response.error) return;
		open.push(...response.data.map((row) => String(row.id)));
		if (response.data.length < PAGE) break;
		after = String(response.data.at(-1)!.id);
	}
	await db.transaction("rw", ["practice_runs", "outbox", "sync_meta"], async () => {
		if ((await wipesOf(db)) !== wipes) return;
		const waiting = new Set(
			(await db.outbox.toArray())
				.filter((item) => item.table === "practice_runs" && item.op === "close")
				.map((item) => item.key)
		);
		for (const id of open) {
			const run = await db.practice_runs.get(id);
			if (run && run.endedAt !== null && !waiting.has(id))
				await db.outbox.add({ table: "practice_runs", key: id, op: "close" });
		}
		await db.sync_meta.put({ key: DONE, value: true });
	});
}
