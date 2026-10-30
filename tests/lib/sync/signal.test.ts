import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signalTopic, syncSignal } from "../../../src/lib/sync/signal";

// Stands in for a Realtime channel: records what was sent and lets the test play the server.
function fakeClient() {
	const sent: { via: "socket" | "http"; event: string }[] = [];
	let onBroadcast = () => {};
	let onStatus: (status: string) => void = () => {};
	const channel = {
		topic: "",
		options: {} as unknown,
		state: "closed",
		on(_type: string, _filter: unknown, callback: () => void) {
			onBroadcast = callback;
			return channel;
		},
		subscribe(callback: (status: string) => void) {
			onStatus = callback;
			return channel;
		},
		send: async (message: { event: string }) => {
			sent.push({ via: "socket", event: message.event });
			return "ok";
		},
		httpSend: async (event: string) => {
			sent.push({ via: "http", event });
			return { success: true };
		}
	};
	let removed = false;
	const client = {
		channel(topic: string, options: unknown) {
			channel.topic = topic;
			channel.options = options;
			return channel;
		},
		removeChannel: async () => {
			removed = true;
			return "ok";
		}
	};
	return {
		client: client as unknown as SupabaseClient,
		channel,
		sent,
		broadcast: () => onBroadcast(),
		status: (status: string) => onStatus(status),
		removed: () => removed
	};
}

describe("sync signal", () => {
	test("listens on the account's own private topic", () => {
		const fake = fakeClient();
		syncSignal(fake.client, "user-1").listen(() => {});
		expect(fake.channel.topic).toBe(signalTopic("user-1"));
		expect(fake.channel.options).toEqual({ config: { private: true } });
	});

	test("a nudge from another device calls back", () => {
		const fake = fakeClient();
		let changes = 0;
		syncSignal(fake.client, "user-1").listen(() => changes++);
		fake.broadcast();
		expect(changes).toBe(1);
	});

	test("rejoining after a lost connection calls back, the first join does not", () => {
		const fake = fakeClient();
		let changes = 0;
		syncSignal(fake.client, "user-1").listen(() => changes++);
		fake.status("SUBSCRIBED");
		expect(changes).toBe(0);
		fake.status("CHANNEL_ERROR");
		fake.status("SUBSCRIBED");
		expect(changes).toBe(1);
	});

	test("announces over the socket while joined and over HTTP otherwise", async () => {
		const fake = fakeClient();
		const signal = syncSignal(fake.client, "user-1");
		signal.announce();
		fake.channel.state = "joined";
		signal.announce();
		await Bun.sleep(0);
		expect(fake.sent).toEqual([
			{ via: "http", event: "changed" },
			{ via: "socket", event: "changed" }
		]);
	});

	test("a failed announcement is swallowed", async () => {
		const fake = fakeClient();
		fake.channel.httpSend = () => Promise.reject(new Error("offline"));
		syncSignal(fake.client, "user-1").announce();
		await Bun.sleep(0);
	});

	test("stopping removes the channel", () => {
		const fake = fakeClient();
		const stop = syncSignal(fake.client, "user-1").listen(() => {});
		stop();
		expect(fake.removed()).toBe(true);
	});
});
