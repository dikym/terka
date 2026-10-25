import { exportData, importData, type ImportResult } from "../db/transfer";
import { readMeta } from "../db/schema";
import { localDay } from "@/core/time/day";
import type { Runtime } from "./runtime";

/** Downloads the whole local history as one JSON file. */
export async function downloadExport(runtime: Runtime): Promise<void> {
	const now = Date.now();
	const text = await exportData(runtime.db, runtime.bundle, now);
	const day = localDay(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
	const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = `terka-${day}.json`;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const lastExportAt = async (runtime: Runtime) =>
	(await readMeta<number>(runtime.db, "lastExportAt")) ?? null;

/** Imports a chosen file, then reloads the log so every screen sees the added answers. */
export async function importFile(runtime: Runtime, file: File): Promise<ImportResult> {
	const result = await importData(runtime.db, await file.text());
	if (result.status === "ok") await runtime.reload();
	return result;
}
