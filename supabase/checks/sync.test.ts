import { describe, expect, test } from "bun:test";
import { AuthRetryableFetchError, createClient } from "@supabase/supabase-js";
import { syncNow, type SyncContext } from "../../src/lib/sync/sync";
import { HOUR, review } from "../../tests/core/replay/fixtures";
import {
	API_URL,
	bundle,
	device,
	fromDevice,
	opened,
	recorded,
	signIn,
	uniqueEmail
} from "./harness";

const NOW = Date.now();
const DAY = 86_400_000;
const ctx = (now = NOW): SyncContext => ({
	now,
	random: () => 0.5,
	online: true,
	retryAfter: () => null
});

describe("a sync round", () => {
	test("sends, pulls and reports synced", async () => {
		const phone = await device(await signIn(uniqueEmail("round")));
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		const result = await syncNow(phone.db, phone.client, ctx(), await opened(phone.db), bundle);
		expect(result.status).toEqual({ quarantined: 0, state: "synced", lastSyncAt: NOW });
		expect(result.nextAt).toBeNull();
		expect(await phone.db.outbox.count()).toBe(0);
	});

	test("data owned by another account is never sent", async () => {
		const phone = await device(await signIn(uniqueEmail("owner")));
		await phone.db.sync_meta.put({ key: "ownerUserId", value: crypto.randomUUID() });
		const result = await syncNow(phone.db, phone.client, ctx(), await opened(phone.db), bundle);
		expect(result.status.state).toBe("otherAccount");
		expect(await phone.db.outbox.count()).toBe(2);
	});

	test("without a session the status asks to sign in again", async () => {
		const phone = await device(await signIn(uniqueEmail("signed-out")));
		await phone.client.auth.signOut();
		const result = await syncNow(phone.db, phone.client, ctx(), await opened(phone.db), bundle);
		expect(result.status.state).toBe("sessionEnded");
	});

	test("an unreachable server backs off and is reported after three days", async () => {
		const phone = await device(await signIn(uniqueEmail("down")));
		const session = (await phone.client.auth.getSession()).data.session!;
		const down = createClient(API_URL, "anon", {
			auth: { persistSession: false },
			global: {
				fetch: (() =>
					Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch
			}
		});
		down.auth.getSession = async () => ({ data: { session }, error: null }) as never;
		const first = await syncNow(phone.db, down, ctx(), await opened(phone.db), bundle);
		expect(first.status).toEqual({ quarantined: 0, state: "pending", count: 2 });
		expect(first.nextAt).toBe(NOW + 750);
		const later = await syncNow(
			phone.db,
			down,
			ctx(NOW + 3 * DAY),
			await opened(phone.db),
			bundle
		);
		expect(later.status).toEqual({ quarantined: 0, state: "unreachable", days: 3 });
		const back = await syncNow(
			phone.db,
			phone.client,
			ctx(NOW + 3 * DAY + 1),
			await opened(phone.db),
			bundle
		);
		expect(back.status.state).toBe("synced");
	});

	test("a server that stays down with nothing to send is still reported unreachable", async () => {
		const phone = await device(await signIn(uniqueEmail("down-empty")));
		await syncNow(phone.db, phone.client, ctx(), await opened(phone.db), bundle);
		const session = (await phone.client.auth.getSession()).data.session!;
		const down = createClient(API_URL, "anon", {
			auth: { persistSession: false },
			global: {
				fetch: (() =>
					Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch
			}
		});
		down.auth.getSession = async () => ({ data: { session }, error: null }) as never;
		const first = await syncNow(phone.db, down, ctx(NOW + 1), await opened(phone.db), bundle);
		const second = await syncNow(phone.db, down, ctx(NOW + 2), await opened(phone.db), bundle);
		expect(second.nextAt! - (NOW + 2)).toBeGreaterThan(first.nextAt! - (NOW + 1));
		const later = await syncNow(
			phone.db,
			down,
			ctx(NOW + 3 * DAY + 1),
			await opened(phone.db),
			bundle
		);
		expect(later.status.state).toBe("unreachable");
	});

	test("a refused session after one refresh reads as ended", async () => {
		const phone = await device(await signIn(uniqueEmail("refused")));
		const session = (await phone.client.auth.getSession()).data.session!;
		const refused = createClient(API_URL, "anon", {
			auth: { persistSession: false },
			global: {
				fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
					String(input).includes("/rest/v1/")
						? Promise.resolve(
								new Response(
									JSON.stringify({ code: "PGRST301", message: "JWT expired" }),
									{ status: 401 }
								)
							)
						: fetch(input, init)) as typeof fetch
			}
		});
		await refused.auth.setSession({
			access_token: session.access_token,
			refresh_token: session.refresh_token
		});
		const result = await syncNow(phone.db, refused, ctx(), await opened(phone.db), bundle);
		expect(result.status.state).toBe("sessionEnded");
	});

	test("an expired token that cannot refresh while offline is a retry, not a sign-out", async () => {
		const phone = await device(await signIn(uniqueEmail("offline-token")));
		phone.client.auth.getSession = async () =>
			({
				data: { session: null },
				error: new AuthRetryableFetchError("fetch failed", 0)
			}) as never;
		const result = await syncNow(phone.db, phone.client, ctx(), await opened(phone.db), bundle);
		expect(result.status.state).not.toBe("sessionEnded");
		expect(result.nextAt).not.toBeNull();
	});
});
