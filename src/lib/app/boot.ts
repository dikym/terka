import type { Bundle } from "@/core/content/schema";
import { loadBundle } from "../content/load";
import { ensureDevice, ensurePersistence } from "../db/device";
import { loadState, type LogState } from "../db/log";
import { TerkaDb } from "../db/schema";
import { deviceLabel } from "./device-label";

type Opened = { db: TerkaDb; bundle: Bundle; deviceId: string; persisted: boolean };
export type Boot =
	| ({ status: "ready"; log: LogState } & Opened)
	| ({ status: "outdated"; log: LogState | null } & Opened)
	| { status: "contentFailed" }
	| { status: "storageFailed" };

export type BootDeps = {
	now: () => number;
	random: () => number;
	userAgent: string;
	loadContent?: typeof loadBundle;
	openDb?: () => TerkaDb;
	storage?: Pick<StorageManager, "persist" | "persisted">;
};

// Content first: without it every card would read as missing data. Storage errors stop the app
// before any write, so a database that cannot be read is never overwritten.
export async function openApp(deps: BootDeps): Promise<Boot> {
	const content = await (deps.loadContent ?? loadBundle)();
	if (content.status !== "ok") return { status: "contentFailed" };
	const { bundle } = content;
	try {
		const db = (deps.openDb ?? (() => new TerkaDb()))();
		const deviceId = await ensureDevice(db, {
			now: deps.now(),
			random: deps.random,
			label: deviceLabel(deps.userAgent),
			platform: deps.userAgent
		});
		const persisted = await ensurePersistence(deps.storage).catch(() => false);
		const loaded = await loadState(db, bundle);
		return loaded.status === "ok"
			? { status: "ready", db, bundle, deviceId, persisted, log: loaded.log }
			: { status: "outdated", db, bundle, deviceId, persisted, log: loaded.log };
	} catch {
		return { status: "storageFailed" };
	}
}
