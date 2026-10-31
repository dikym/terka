import { beforeAll, describe, expect, test } from "bun:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { API_URL, signIn, uniqueEmail } from "./harness";

const status = JSON.parse(
	Bun.spawnSync(["bunx", "supabase", "status", "-o", "json"]).stdout.toString()
);

async function sessionId(client: SupabaseClient): Promise<string> {
	const { data } = await client.auth.getSession();
	const payload = data.session!.access_token.split(".")[1]!;
	return JSON.parse(Buffer.from(payload, "base64url").toString()).session_id;
}

describe("device removal", () => {
	const anon = createClient(API_URL, status.ANON_KEY, { auth: { persistSession: false } });
	let a: SupabaseClient;
	let b: SupabaseClient;
	let aSession: string;
	let bSession: string;

	beforeAll(async () => {
		const email = uniqueEmail("removal");
		a = (await signIn(email)).client;
		b = (await signIn(email)).client;
		aSession = await sessionId(a);
		bSession = await sessionId(b);
	});

	test("removing a device revokes its session so it cannot refresh", async () => {
		const device = Bun.randomUUIDv7();
		const inserted = await b.from("devices").insert({
			id: device,
			created_at: new Date().toISOString(),
			label: "B",
			platform: "bun"
		});
		expect(inserted.error).toBeNull();

		const removed = await a.rpc("remove_device", { device });
		expect(removed.error).toBeNull();

		const refreshed = await b.auth.refreshSession();
		expect(refreshed.error).not.toBeNull();
	});

	test("the removed session is reported removed without signing in", async () => {
		const { data } = await anon.rpc("session_removed", { session: bSession });
		expect(data).toBe(true);
	});

	test("a session that was not removed is reported kept", async () => {
		const { data } = await anon.rpc("session_removed", { session: aSession });
		expect(data).toBe(false);
	});
});
