import type { Page } from "@playwright/test";
import type { LearningEvent } from "../../../src/core/log/events";

// The app creates the database on its first page load; add rows once its stores exist.
export async function seed(
	page: Page,
	events: LearningEvent[],
	meta: Record<string, unknown> = {}
) {
	await page.evaluate(
		async ({ events, meta }) => {
			const tables = [...new Set(events.map((event) => event.table)), "sync_meta"];
			const open = () =>
				new Promise<IDBDatabase>((resolve, reject) => {
					const request = indexedDB.open("terka-v2");
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
			// Opening before the app's upgrade finishes sees no stores (WebKit lists the name early).
			for (let attempt = 0; ; attempt++) {
				const listed = (await indexedDB.databases()).some(
					(database) => database.name === "terka-v2"
				);
				const db = listed ? await open() : null;
				if (db && tables.every((table) => db.objectStoreNames.contains(table))) {
					const tx = db.transaction(tables, "readwrite");
					for (const event of events) tx.objectStore(event.table).put(event.row);
					for (const [key, value] of Object.entries(meta))
						tx.objectStore("sync_meta").put({ key, value });
					await new Promise((resolve, reject) => {
						tx.oncomplete = resolve;
						tx.onerror = () => reject(tx.error);
					});
					db.close();
					return;
				}
				db?.close();
				if (attempt > 100) throw new Error("the app never created its database");
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		},
		{ events, meta }
	);
}

export async function rows(page: Page, table: string): Promise<unknown[]> {
	return page.evaluate(async (table) => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open("terka-v2");
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		const all = await new Promise<unknown[]>((resolve, reject) => {
			const request = db.transaction(table).objectStore(table).getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		db.close();
		return all;
	}, table);
}
