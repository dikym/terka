import type { FsrsParams } from "../log/events";
import { compareKeys } from "../log/order";
import { createScheduler, type Scheduler } from "../scheduling/fsrs";

// Rows the server has seen cannot activate later than they arrived.
export const activation = (row: FsrsParams) =>
	Math.min(row.activatedAt ?? Infinity, row.receivedAt ?? Infinity);

const byActivation = (a: FsrsParams, b: FsrsParams) =>
	compareKeys(
		{ ts: activation(a), deviceId: a.deviceId, id: a.id },
		{ ts: activation(b), deviceId: b.deviceId, id: b.id }
	);

export function addParams(list: FsrsParams[], row: FsrsParams): FsrsParams[] {
	if (row.status !== "active" || row.activatedAt === null) return list;
	return [...list.filter((item) => item.id !== row.id), row].sort(byActivation);
}

const schedulers = new Map<string, Scheduler>();

// `list` is the activation-sorted list addParams builds.
export function paramsAt(list: readonly FsrsParams[], at: number): FsrsParams | null {
	let chosen: FsrsParams | null = null;
	for (const row of list) if (activation(row) <= at) chosen = row;
	return chosen;
}

export function schedulerAt(list: readonly FsrsParams[], at: number): Scheduler {
	const chosen = paramsAt(list, at);
	const key = chosen ? chosen.weights.join(",") : "default";
	let scheduler = schedulers.get(key);
	if (!scheduler) {
		scheduler = createScheduler(chosen?.weights);
		schedulers.set(key, scheduler);
	}
	return scheduler;
}
