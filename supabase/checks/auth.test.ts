import { describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { seeded } from "../../src/core/random";
import { deleteAccount, signOut } from "../../src/lib/auth/account";
import { createTerkaClient } from "../../src/lib/auth/client";
import { acceptPolicy } from "../../src/lib/auth/consent";
import {
	afterSignIn,
	requestEmailCode,
	switchAccount,
	verifyEmailCode
} from "../../src/lib/auth/signin";
import { ensureDevice } from "../../src/lib/db/device";
import { readMeta, TerkaDb } from "../../src/lib/db/schema";
import { syncNow } from "../../src/lib/sync/sync";
import { PRIVACY_POLICY_VERSION } from "../../src/rules";
import { HOUR, review } from "../../tests/core/replay/fixtures";
import { openDatabase } from "./database";
import { API_URL, bundle, fromDevice, opened, recorded, uniqueEmail } from "./harness";

const status = JSON.parse(
	Bun.spawnSync(["bunx", "supabase", "status", "-o", "json"]).stdout.toString()
);
const CALLBACK = "http://localhost:3000/auth/callback";
const NOW = Date.now();
const sql = openDatabase();
const admin = createClient(API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function emailedCode(email: string): Promise<string> {
	for (let attempt = 0; attempt < 20; attempt++) {
		const search = await (
			await fetch(
				`${status.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`
			)
		).json();
		if (search.messages?.length) {
			const message = await (
				await fetch(`${status.MAILPIT_URL}/api/v1/message/${search.messages[0].ID}`)
			).json();
			return message.HTML.match(/<strong>(\d{6})<\/strong>/)[1];
		}
		await Bun.sleep(100);
	}
	throw new Error(`no email for ${email}`);
}

async function browser() {
	const db = new TerkaDb(`auth-${crypto.randomUUID()}`);
	const deviceId = await ensureDevice(db, {
		now: NOW,
		random: seeded(crypto.randomUUID()),
		label: "Test",
		platform: "bun"
	});
	const { client, retryAfter } = createTerkaClient(API_URL, status.ANON_KEY);
	return { db, deviceId, client, retryAfter };
}

// A second sign-in for the same email within a minute is refused by design, so tests take
// that code from the admin API, which issues it without sending an email.
async function signInByEmail(
	device: Awaited<ReturnType<typeof browser>>,
	email: string,
	again = false
) {
	await acceptPolicy(device.db, PRIVACY_POLICY_VERSION, NOW);
	let code: string;
	if (again) {
		const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
		code = link.data.properties!.email_otp;
	} else {
		expect(
			await requestEmailCode(device.db, device.client, email, undefined, CALLBACK, NOW)
		).toEqual({ status: "ok" });
		code = await emailedCode(email);
	}
	expect(await verifyEmailCode(device.client, email, code)).toEqual({ status: "ok" });
	return afterSignIn(device.db, device.client, NOW);
}

const sync = async (device: Awaited<ReturnType<typeof browser>>) =>
	syncNow(
		device.db,
		device.client,
		{ now: NOW, random: () => 0.5, online: true, retryAfter: device.retryAfter },
		await opened(device.db),
		bundle
	);

describe("signing in with an emailed code", () => {
	test("a wrong code is refused and the right one signs in, claims the device and sends the consent first", async () => {
		const phone = await browser();
		const email = uniqueEmail("code");
		await acceptPolicy(phone.db, PRIVACY_POLICY_VERSION, NOW);
		await requestEmailCode(phone.db, phone.client, email, undefined, CALLBACK, NOW);
		expect(await verifyEmailCode(phone.client, email, "000000")).toEqual({ status: "invalid" });
		expect(await verifyEmailCode(phone.client, email, await emailedCode(email))).toEqual({
			status: "ok"
		});
		const signedIn = await afterSignIn(phone.db, phone.client, NOW);
		expect(signedIn.status).toBe("ok");
		expect((await sync(phone)).status.state).toBe("synced");
		const { data } = await phone.client
			.from("privacy_consents")
			.select("policy_version, device_id");
		expect(data).toEqual([
			{ policy_version: PRIVACY_POLICY_VERSION, device_id: phone.deviceId }
		]);
	});

	test("asking for a second code within a minute is refused as too soon", async () => {
		const phone = await browser();
		const email = uniqueEmail("soon");
		await acceptPolicy(phone.db, PRIVACY_POLICY_VERSION, NOW);
		await requestEmailCode(phone.db, phone.client, email, undefined, CALLBACK, NOW);
		expect(
			await requestEmailCode(phone.db, phone.client, email, undefined, CALLBACK, NOW)
		).toEqual({
			status: "tooSoon"
		});
	});
});

describe("claiming and switching accounts", () => {
	test("answers given without an account are claimed, sent, and merged with the account's other device", async () => {
		const email = uniqueEmail("claim");
		const laptop = await browser();
		await signInByEmail(laptop, email);
		await recorded(
			laptop.db,
			fromDevice(laptop.deviceId, [review("bk", "code2region", NOW - 2 * HOUR)])
		);
		await sync(laptop);
		const phone = await browser();
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		expect((await signInByEmail(phone, email, true)).status).toBe("ok");
		const result = await sync(phone);
		expect(result.status.state).toBe("synced");
		expect(await phone.db.review_logs.count()).toBe(2);
		const { count } = await phone.client
			.from("review_logs")
			.select("id", { count: "exact", head: true });
		expect(count).toBe(2);
	});

	test("another account's data is never sent, and wiping it lets the new account claim the device", async () => {
		const phone = await browser();
		await signInByEmail(phone, uniqueEmail("first"));
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		await phone.client.auth.signOut({ scope: "local" });
		const second = uniqueEmail("second");
		expect((await signInByEmail(phone, second)).status).toBe("otherAccount");
		expect((await sync(phone)).status.state).toBe("otherAccount");
		expect((await switchAccount(phone.db, phone.client, NOW)).status).toBe("ok");
		expect((await sync(phone)).status.state).toBe("synced");
		const { count } = await phone.client
			.from("review_logs")
			.select("id", { count: "exact", head: true });
		expect(count).toBe(0);
		const { data } = await phone.client.from("privacy_consents").select("policy_version");
		expect(data).toHaveLength(1);
	});

	test("signing in again after the session ended sends what waited", async () => {
		const email = uniqueEmail("again");
		const phone = await browser();
		await signInByEmail(phone, email);
		await sync(phone);
		await phone.client.auth.signOut({ scope: "local" });
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		expect((await sync(phone)).status.state).toBe("sessionEnded");
		expect((await signInByEmail(phone, email, true)).status).toBe("ok");
		expect((await sync(phone)).status.state).toBe("synced");
		expect(await phone.db.outbox.count()).toBe(0);
	});
});

describe("signing out and deleting the account", () => {
	test("sign-out warns about unsent changes, then wipes local data but keeps the device id", async () => {
		const phone = await browser();
		await signInByEmail(phone, uniqueEmail("out"));
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		const warned = await signOut(phone.db, phone.client, { confirmed: false, now: NOW });
		expect(warned.status).toBe("pending");
		expect(await phone.db.review_logs.count()).toBe(1);
		expect(await signOut(phone.db, phone.client, { confirmed: true, now: NOW })).toEqual({
			status: "ok"
		});
		expect(await phone.db.review_logs.count()).toBe(0);
		expect(await readMeta<string>(phone.db, "deviceId")).toBe(phone.deviceId);
		expect((await phone.client.auth.getSession()).data.session).toBeNull();
	});

	test("deleting the account removes every server row and leaves local data owned by the deleted account", async () => {
		const phone = await browser();
		const signedIn = await signInByEmail(phone, uniqueEmail("delete"));
		if (signedIn.status !== "ok") throw new Error("expected a session");
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		await sync(phone);
		expect(await deleteAccount(phone.db, phone.client)).toEqual({ status: "ok" });
		const [left] = await sql`
			select (select count(*) from auth.users where id = ${signedIn.userId})
				+ (select count(*) from public.review_logs where user_id = ${signedIn.userId})
				+ (select count(*) from public.devices where user_id = ${signedIn.userId}) as count`;
		expect(Number(left.count)).toBe(0);
		expect(await phone.db.review_logs.count()).toBe(1);
		expect(await readMeta<string>(phone.db, "ownerUserId")).toBe(signedIn.userId);
	});
});

describe("auth configuration", () => {
	test("redirects, email rate limit and the code template match the spec", () => {
		const config = readFileSync("supabase/config.toml", "utf8");
		expect(config).toContain(
			'additional_redirect_urls = ["http://localhost:3000/auth/callback", "https://terka.my.id/auth/callback"]'
		);
		expect(config).toMatch(/\[auth\.rate_limit\][^[]*\nemail_sent = 80\n/);
		expect(config).toMatch(/max_frequency = "60s"\notp_length = 6/);
		expect(readFileSync("supabase/templates/magic_link.html", "utf8")).toContain(
			"{{ .Token }}"
		);
	});
});
