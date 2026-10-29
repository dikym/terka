import type { LearningEvent } from "../../../../src/core/log/events";
import type { CardMode } from "../../../../src/core/questions/question";
import { dailyQueue } from "../../../../src/core/session/queue";
import { readEvents } from "../../../../src/lib/db/log";
import { homeView } from "../../../../src/lib/view/home";
import { manyRegions } from "../../../core/replay/fixtures";
import { ctxAt, SETTINGS } from "../../../core/session/fixtures";
import type { Device } from "./device";
import { closeOf, DAY, HOUR, MINUTE, NOW, openRun, review } from "./events";

// Enough regions that a few days of daily sessions never run out of new cards.
export const bundle = () => manyRegions(80);

export const at = (day: number, hour = 9) => NOW + day * DAY + hour * HOUR;
export const dayKey = (day: number) =>
	new Date(NOW + day * DAY + 8 * HOUR).toISOString().slice(0, 10);

const ctx = (device: Device, now: number) => ctxAt(now, device.id);

/**
 * Plays the daily session the way the app does: the planned queue first, then the learning steps
 * again until nothing is due, closing the run once everything planned was answered.
 */
export async function playDaily(device: Device, start: number): Promise<number> {
	const first = dailyQueue(device.state(), bundle(), SETTINGS, ctx(device, start));
	const daily = openRun("daily", start, { plannedCount: first.items.length });
	await device.record(daily);
	let clock = start;
	for (let pass = 0; pass < 8; pass++) {
		const queue =
			pass === 0 ? first : dailyQueue(device.state(), bundle(), SETTINGS, ctx(device, clock));
		if (!queue.items.length) break;
		for (const [index, item] of queue.items.entries()) {
			const [contentId, mode] = item.cardId.split("::") as [string, CardMode];
			const when = clock + (index + 1) * MINUTE;
			await device.record(
				review(
					contentId,
					mode,
					when,
					item.context === "intro"
						? {
								runId: daily.row.id,
								context: "intro",
								level: 1,
								questionType: "choice"
							}
						: { runId: daily.row.id }
				)
			);
		}
		clock += (queue.items.length + 12) * MINUTE;
	}
	await device.record(closeOf(daily, clock));
	return first.items.length;
}

export const homeOf = (device: Device, now: number) =>
	homeView(device.state(), bundle(), SETTINGS, ctx(device, now), "");

export const queueOf = (device: Device, now: number) =>
	dailyQueue(device.state(), bundle(), SETTINGS, ctx(device, now));

// Every event the device holds, in the shape replay takes.
export const eventsOf = (device: Device): Promise<LearningEvent[]> => readEvents(device.db);
