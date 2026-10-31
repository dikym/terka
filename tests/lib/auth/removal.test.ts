import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { removeDevice } from "../../../src/lib/auth/account";
import {
	checkRemoved,
	leaveRemovedDevice,
	rememberSession,
	sessionIdOf
} from "../../../src/lib/auth/removal";
import { readMeta } from "../../../src/lib/db/schema";
import { openDevice } from "../sync/support/device";
import { answersOf, NOW, openRun } from "../sync/support/events";
import { FakeServer } from "../sync/support/server";
import { pair } from "../sync/support/world";

const token = (claims: unknown) =>
	`x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;

const accessToken = async (client: SupabaseClient) =>
	(await client.auth.getSession()).data.session?.access_token;

const removed = async () => {
	const world = await pair();
	for (const device of [world.a, world.b, world.a]) await device.sync();
	await removeDevice(world.a.db, world.a.client, world.b.id, world.a.now());
	return world;
};

describe("the session of this device", () => {
	test("reads the session id from an access token", () => {
		const id = "7f1c2a90-3e5b-4c8d-a6f2-91b0d3e4c5a7";
		const signed = token({ sub: "user-1", name: "Rina ~>", session_id: id });
		expect(signed).toMatch(/[-_]/);
		expect(sessionIdOf(signed)).toBe(id);
	});

	test("an unreadable token has no session id", () => {
		const unreadable = [
			undefined,
			"",
			"token",
			"x.%%%.y",
			`x.${Buffer.from("not json").toString("base64url")}.y`,
			token(null),
			token({ sub: "user-1" }),
			token({ session_id: 42 })
		];
		for (const value of unreadable) expect(sessionIdOf(value)).toBeNull();
	});
});

describe("asking whether this device was removed", () => {
	test("a removed session is reported removed", async () => {
		const { b } = await removed();
		const id = await rememberSession(b.db, await accessToken(b.client));
		expect(id).toBe(b.auth.sessionId!);
		expect(await rememberSession(b.db, undefined)).toBe(id);
		expect(await checkRemoved(b.db, b.client)).toBe("removed");
	});

	test("a session the server keeps is reported kept", async () => {
		const { a } = await removed();
		await rememberSession(a.db, await accessToken(a.client));
		expect(await checkRemoved(a.db, a.client)).toBe("kept");
	});

	test("a server error is unknown", async () => {
		const { server, b } = await removed();
		server.fail({ table: "session_removed", op: "rpc", status: 503 });
		expect(await checkRemoved(b.db, b.client, b.auth.sessionId)).toBe("unknown");
		const throwing = {
			rpc: () => Promise.reject(new TypeError("Failed to fetch"))
		} as unknown as SupabaseClient;
		expect(await checkRemoved(b.db, throwing, b.auth.sessionId)).toBe("unknown");
	});

	test("a server without the function is unknown", async () => {
		const { server, b } = await removed();
		server.deviceSessions = false;
		expect(await checkRemoved(b.db, b.client, b.auth.sessionId)).toBe("unknown");
	});

	test("without any session id the answer is unknown", async () => {
		const server = new FakeServer();
		const device = await openDevice(server, { name: "phone" });
		expect(await checkRemoved(device.db, device.client)).toBe("unknown");
		expect(server.calls.filter((call) => call.table === "session_removed")).toEqual([]);
	});
});

describe("leaving a removed device", () => {
	test("leaving signs out and wipes everything but the device id", async () => {
		const { b } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await b.record(daily);
		await b.record(...answersOf(daily, ["ba"], NOW));
		await b.sync();
		await rememberSession(b.db, await accessToken(b.client));
		const first = leaveRemovedDevice(b.db, b.client);
		expect(leaveRemovedDevice(b.db, b.client)).toBe(first);
		await first;
		expect((await b.client.auth.getSession()).data.session).toBeNull();
		expect(await b.ids("review_logs")).toEqual([]);
		expect(await b.ids("practice_runs")).toEqual([]);
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
		expect(await readMeta(b.db, "sessionId")).toBeUndefined();
		expect(await readMeta<string>(b.db, "deviceId")).toBe(b.id);
	});
});
