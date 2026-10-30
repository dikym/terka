import { afterAll, describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signalTopic, syncSignal } from "../../src/lib/sync/signal";
import { signIn, uniqueEmail } from "./harness";

const clients: SupabaseClient[] = [];
afterAll(async () => {
	for (const client of clients) await client.removeAllChannels();
});

async function session(email: string) {
	const signed = await signIn(email);
	clients.push(signed.client);
	return signed;
}

const until = async (check: () => boolean, ms = 10_000) => {
	const end = Date.now() + ms;
	while (!check() && Date.now() < end) await Bun.sleep(50);
	return check();
};

// Resolves with the first status that settles a private channel join; a refusal takes a few seconds.
function joined(client: SupabaseClient, topic: string) {
	return new Promise<string>((resolve) => {
		client.channel(topic, { config: { private: true } }).subscribe((status) => {
			if (status !== "CLOSED") resolve(status);
		});
	});
}

describe("sync signal", () => {
	test("a nudge from one device reaches another device of the same account", async () => {
		const email = uniqueEmail("signal");
		const sender = await session(email);
		const receiver = await session(email);
		let nudges = 0;
		const listening = syncSignal(receiver.client, receiver.userId);
		listening.listen(() => nudges++);
		const channel = receiver.client.getChannels()[0];
		expect(await until(() => channel.state === "joined")).toBe(true);
		syncSignal(sender.client, sender.userId).announce();
		expect(await until(() => nudges > 0)).toBe(true);
	});

	test("another account cannot join the topic", async () => {
		const owner = await session(uniqueEmail("signal-owner"));
		const stranger = await session(uniqueEmail("signal-stranger"));
		const topic = signalTopic(owner.userId);
		const [theirs, own] = await Promise.all([
			joined(stranger.client, topic),
			joined(owner.client, topic)
		]);
		expect(theirs).toBe("CHANNEL_ERROR");
		expect(own).toBe("SUBSCRIBED");
	}, 20_000);
});
