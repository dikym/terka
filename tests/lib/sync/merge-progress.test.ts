import { describe, expect, test } from "bun:test";
import type { LearningEvent } from "../../../src/core/log/events";
import type { CardMode } from "../../../src/core/questions/question";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { sortEvents } from "../../../src/core/log/order";
import { replay } from "../../../src/core/replay/replay";
import { streakDays } from "../../../src/core/replay/streak";
import { planSession } from "../../../src/lib/session/modes";
import { snapshot } from "../../core/replay/fixtures";
import { ctxAt, SETTINGS } from "../../core/session/fixtures";
import { eventIds, expectConsistent, openDevice, type Device } from "./support/device";
import { MINUTE, review } from "./support/events";
import { FakeServer } from "./support/server";
import { at, bundle, dayKey, eventsOf, homeOf, playDaily, queueOf } from "./support/session";

const TODAY = 5;
const EVENING = at(TODAY, 20);

// Which days each device played its daily session; the phone never syncs before it signs in.
type Plan = { laptop: number[]; phone: number[]; phoneFirstToday?: boolean };

const PLANS: Record<string, Plan> = {
	"the laptop started later than the phone": { laptop: [2, 3, 4, 5], phone: [0, 1, 2, 3, 4] },
	"both devices played every day": { laptop: [0, 1, 2, 3, 4, 5], phone: [0, 1, 2, 3, 4] },
	"both devices played today, the phone first": {
		laptop: [0, 1, 2, 3, 4, 5],
		phone: [0, 1, 2, 3, 4, 5],
		phoneFirstToday: true
	},
	"the phone only has old days": { laptop: [0, 1, 2, 3, 4, 5], phone: [0, 1] },
	"the phone has gaps": { laptop: [0, 1, 2, 3, 4, 5], phone: [0, 2, 4] },
	"the phone played today only": { laptop: [0, 1, 2, 3, 4, 5], phone: [5] },
	"the laptop only played today": { laptop: [5], phone: [0, 1, 2, 3, 4] }
};

async function play(plan: Plan) {
	const server = new FakeServer();
	server.clock.now = at(0, 8);
	const laptop = await openDevice(server, { name: "laptop", bundle });
	await laptop.signIn();
	const phone = await openDevice(server, { name: "phone", bundle });
	const days = [...new Set([...plan.laptop, ...plan.phone])].sort((a, b) => a - b);
	for (const day of days) {
		const phoneHour = day === TODAY && plan.phoneFirstToday ? 7 : 10;
		server.clock.now = at(day, 8);
		if (plan.phone.includes(day)) await playDaily(phone, at(day, phoneHour));
		if (plan.laptop.includes(day)) {
			await playDaily(laptop, at(day, 9));
			server.clock.now = at(day, 12);
			await laptop.sync();
		}
	}
	return { server, laptop, phone };
}

// The phone signs in with its local history; both devices then sync until nothing is left to move.
async function merge(server: FakeServer, laptop: Device, phone: Device) {
	server.clock.now = at(TODAY, 18);
	await phone.signIn();
	await phone.sync();
	await laptop.sync();
	await phone.sync();
	await laptop.sync();
}

// The state a fresh replay of everything either device recorded gives, without any sync.
async function expected(...devices: Device[]) {
	const all = new Map<string, LearningEvent>();
	for (const device of devices)
		for (const event of await eventsOf(device))
			all.set(`${event.table}:${event.row.id}`, event);
	const result = replay([...all.values()], bundle(), { collect: true });
	if (result.status !== "ok") throw new Error("replay is outdated");
	return result.state;
}

describe("a finished daily session when older progress from another device arrives", () => {
	test("stays the day's only session for reviews and new material on both devices", async () => {
		const { server, laptop, phone } = await play(
			PLANS["the laptop started later than the phone"]
		);
		const before = homeOf(laptop, EVENING);
		expect(before).toMatchObject({ finished: true });
		expect(before.summary.streak).toBe(4);

		await merge(server, laptop, phone);
		for (const device of [laptop, phone]) {
			const home = homeOf(device, EVENING);
			expect(queueOf(device, EVENING).items).toEqual([]);
			expect(home).toMatchObject({ finished: true, idle: false });
			expect(home.summary).toMatchObject({ due: 0, newAvailable: 0 });
			expect(device.state().doneDays.has(dayKey(TODAY))).toBe(true);
			expect(home.summary.streak).toBe(6);
			expect(home.week.at(-1)!.state).toBe("done");
		}
		await expectConsistent(laptop, phone);
	});

	test("hands the cards the phone taught to tomorrow's session", async () => {
		const { server, laptop, phone } = await play(
			PLANS["the laptop started later than the phone"]
		);
		await merge(server, laptop, phone);
		const events = await eventsOf(laptop);
		const taughtBy = new Map<string, string>();
		for (const event of sortEvents(events))
			if (event.table === "review_logs" && event.row.context === "intro") {
				const card = `${event.row.contentId}::${event.row.mode}`;
				if (!taughtBy.has(card)) taughtBy.set(card, event.row.deviceId);
			}
		const answeredToday = new Set(
			events.flatMap((event) =>
				event.table === "review_logs" && event.row.localDay === dayKey(TODAY)
					? [`${event.row.contentId}::${event.row.mode}`]
					: []
			)
		);
		const union = await expected(laptop, phone);
		const owed = [...union.cards.values()]
			.filter(
				(card) =>
					(card.state === "review" || card.state === "mature") &&
					card.due < at(TODAY + 1, 0) &&
					taughtBy.get(card.cardId) === phone.id &&
					!answeredToday.has(card.cardId)
			)
			.map((card) => card.cardId);
		expect(owed.length).toBeGreaterThan(0);
		for (const device of [laptop, phone]) {
			const tomorrow = queueOf(device, at(TODAY + 1, 9)).items.map((item) => item.cardId);
			for (const card of owed) expect(tomorrow).toContain(card);
		}
	});

	test("leaves the mastery where it was when the merged day's extra practice is answered", async () => {
		const { server, laptop, phone } = await play(
			PLANS["the laptop started later than the phone"]
		);
		await merge(server, laptop, phone);
		const schedule = () =>
			[...laptop.state().cards].map(([id, card]) => [
				id,
				card.state,
				card.reps,
				card.lapses,
				card.due,
				card.stability
			]);
		const mastery = homeOf(laptop, EVENING).scope.mastered;
		const before = schedule();
		const plan = planSession(
			"harian",
			{
				state: laptop.state(),
				bundle: bundle(),
				dictionary: buildDictionary(bundle()),
				settings: SETTINGS,
				notes: new Map(),
				ctx: ctxAt(EVENING, laptop.id),
				nonce: "extra"
			},
			{ scope: null, code: null }
		);
		if (plan.kind !== "ready") throw new Error("expected extra practice");
		expect(plan.run.kind).toBe("focused");
		expect(plan.cards.length).toBeGreaterThan(0);
		for (const [index, card] of plan.cards.entries()) {
			const [contentId, mode] = card.id.split("#")[0].split("::") as [string, CardMode];
			await laptop.record(
				review(contentId, mode, EVENING + (index + 1) * MINUTE, { context: "focused" })
			);
		}
		expect(schedule()).toEqual(before);
		expect(homeOf(laptop, EVENING).scope.mastered).toBe(mastery);
	});

	test("closes the day whichever way the two histories overlap", async () => {
		for (const [name, plan] of Object.entries(PLANS)) {
			const { server, laptop, phone } = await play(plan);
			await merge(server, laptop, phone);
			for (const device of [laptop, phone]) {
				expect([name, queueOf(device, EVENING).items]).toEqual([name, []]);
				expect([name, homeOf(device, EVENING).finished]).toEqual([name, true]);
			}
		}
	}, 120_000);

	test("still offers a day nobody finished, without cards already answered that day", async () => {
		const { server, laptop, phone } = await play({
			laptop: [0, 1, 2, 3, 4],
			phone: [0, 1, 2, 3, 4]
		});
		await merge(server, laptop, phone);
		const state = await expected(laptop, phone);
		const countedToday = new Set(
			state
				.counted!.filter((answer) => answer.localDay === dayKey(TODAY) && answer.settled)
				.map((answer) => answer.cardId)
		);
		const items = queueOf(laptop, EVENING).items;
		expect(items.length).toBeGreaterThan(0);
		expect(homeOf(laptop, EVENING).finished).toBe(false);
		for (const item of items.filter((entry) => entry.slot === "review"))
			expect(countedToday.has(item.cardId)).toBe(false);
	});
});

describe("merging two devices' progress", () => {
	for (const [name, plan] of Object.entries(PLANS)) {
		test(`loses no event when ${name}`, async () => {
			const { server, laptop, phone } = await play(plan);
			const own = [await eventIds(laptop), await eventIds(phone)];
			await merge(server, laptop, phone);

			const after = await eventIds(laptop);
			expect(await eventIds(phone)).toEqual(after);
			for (const [table, ids] of Object.entries(after))
				expect(server.ids(table as "review_logs")).toEqual(ids);
			for (const mine of own)
				for (const [table, ids] of Object.entries(mine))
					for (const id of ids) expect(after[table]).toContain(id);
			expect(await laptop.outbox()).toEqual([]);
			expect(await phone.outbox()).toEqual([]);
			expect(await laptop.quarantined()).toEqual([]);
			expect(await phone.quarantined()).toEqual([]);
		}, 60_000);

		test(`schedules every card as a replay of both histories does when ${name}`, async () => {
			const { server, laptop, phone } = await play(plan);
			const union = await expected(laptop, phone);
			await merge(server, laptop, phone);
			for (const device of [laptop, phone]) {
				expect(snapshot(device.state())).toEqual(snapshot(union));
				expect(snapshot(await device.rebuilt())).toEqual(snapshot(union));
			}
			await expectConsistent(laptop, phone);
		}, 60_000);
	}

	test("brings every day either device finished into the streak of both", async () => {
		const { server, laptop, phone } = await play(PLANS["the phone has gaps"]);
		await merge(server, laptop, phone);
		const days = [0, 1, 2, 3, 4, 5].map(dayKey);
		for (const device of [laptop, phone]) {
			expect([...streakDays(device.state())].sort()).toEqual(days);
			for (const day of days) expect(device.state().doneDays.has(day)).toBe(true);
		}
	});

	test("counts a day both devices finished once", async () => {
		const { server, laptop, phone } = await play(
			PLANS["both devices played today, the phone first"]
		);
		await merge(server, laptop, phone);
		expect(streakDays(laptop.state()).size).toBe(6);
		expect(homeOf(laptop, EVENING).summary.streak).toBe(6);
	});

	test("schedules a card both devices answered on the same day by the earlier answer only", async () => {
		const { server, laptop, phone } = await play(
			PLANS["both devices played today, the phone first"]
		);
		await merge(server, laptop, phone);
		const state = await expected(laptop, phone);
		const perCard = new Map<string, number>();
		for (const answer of state.counted!.filter((entry) => entry.settled)) {
			const key = `${answer.cardId}|${answer.localDay}`;
			perCard.set(key, (perCard.get(key) ?? 0) + 1);
		}
		expect([...perCard.values()].filter((count) => count > 1)).toEqual([]);
		const phoneToday = (await phone.db.review_logs.toArray()).filter(
			(row) => row.localDay === dayKey(TODAY) && row.deviceId === phone.id
		);
		expect(phoneToday.length).toBeGreaterThan(0);
	});

	test("gives the same state whichever device syncs first", async () => {
		const first = await play(PLANS["the laptop started later than the phone"]);
		const laptopEvents = await eventsOf(first.laptop);
		const phoneEvents = await eventsOf(first.phone);
		await merge(first.server, first.laptop, first.phone);

		// The same events again, so ids and therefore schedule fuzz match, merged in the other order.
		const server = new FakeServer();
		server.clock.now = at(TODAY, 12);
		const laptop = await openDevice(server, { name: "laptop", bundle });
		await laptop.signIn();
		const phone = await openDevice(server, { name: "phone", bundle });
		const fresh = (event: LearningEvent) =>
			({
				...event,
				row: { ...event.row, receivedAt: null, serverSeq: null }
			}) as LearningEvent;
		await laptop.record(...laptopEvents.map(fresh));
		await phone.record(...phoneEvents.map(fresh));
		await laptop.sync();
		server.clock.now = at(TODAY, 18);
		await phone.signIn();
		await laptop.sync();
		await phone.sync();
		await laptop.sync();
		await phone.sync();

		expect(await eventIds(laptop)).toEqual(await eventIds(first.laptop));
		// Device ids are new in every world, so only the tie-break key's device differs.
		const comparable = (device: Device) => {
			const state = snapshot(device.state());
			return { ...state, lastKey: { ...state.lastKey!, deviceId: "" } };
		};
		expect(comparable(laptop)).toEqual(comparable(first.laptop));
		expect(comparable(phone)).toEqual(comparable(first.phone));
	}, 60_000);

	test("changes nothing when both devices sync again", async () => {
		const { server, laptop, phone } = await play(PLANS["both devices played every day"]);
		await merge(server, laptop, phone);
		const events = await eventIds(laptop);
		const state = snapshot(laptop.state());
		server.clock.now += 30 * MINUTE;
		await phone.sync();
		await laptop.sync();
		expect(await eventIds(laptop)).toEqual(events);
		expect(await eventIds(phone)).toEqual(events);
		expect(snapshot(laptop.state())).toEqual(state);
		expect(snapshot(phone.state())).toEqual(state);
	});
});

describe("signing in on the phone", () => {
	test("sends the answers recorded before signing in and the laptop receives them", async () => {
		const { server, laptop, phone } = await play(PLANS["the phone only has old days"]);
		const local = await eventIds(phone);
		await merge(server, laptop, phone);
		for (const [table, ids] of Object.entries(local))
			for (const id of ids) expect(await laptop.stored(table, id)).toBeDefined();
	});

	test("keeps an answer recorded offline afterwards for the next sync", async () => {
		const { server, laptop, phone } = await play(PLANS["the phone only has old days"]);
		await merge(server, laptop, phone);
		server.clock.now = at(TODAY, 19);
		const late = review("bk", "code2region", at(TODAY, 19), { context: "focused" });
		await phone.record(late);
		expect(await laptop.stored("review_logs", late.row.id)).toBeUndefined();
		expect((await phone.outbox()).length).toBeGreaterThan(0);
		server.clock.now = at(TODAY, 21);
		await phone.sync();
		await laptop.sync();
		expect(await phone.outbox()).toEqual([]);
		expect(await laptop.stored("review_logs", late.row.id)).toBeDefined();
		await expectConsistent(laptop, phone);
		expect(laptop.state().doneDays.has(dayKey(TODAY))).toBe(true);
	});
});

describe("three devices", () => {
	test("end with the same events and the same card schedules", async () => {
		const { server, laptop, phone } = await play(PLANS["the phone has gaps"]);
		const tablet = await openDevice(server, { name: "tablet", bundle });
		server.clock.now = at(1, 8);
		await playDaily(tablet, at(1, 15));
		server.clock.now = at(3, 8);
		await playDaily(tablet, at(3, 15));
		const union = await expected(laptop, phone, tablet);
		server.clock.now = at(TODAY, 17);
		await tablet.signIn();
		await tablet.sync();
		await merge(server, laptop, phone);
		await tablet.sync();
		await laptop.sync();
		await phone.sync();
		await expectConsistent(laptop, phone, tablet);
		expect(snapshot(tablet.state())).toEqual(snapshot(await expected(laptop, phone, tablet)));
		expect(snapshot(laptop.state()).quota).toEqual(snapshot(union).quota);
	}, 60_000);
});
