import { describe, expect, test } from "bun:test";
import { AuthError, type SupabaseClient } from "@supabase/supabase-js";
import { acceptPolicy } from "../../../src/lib/auth/consent";
import { finishCallback, requestEmailCode, signInWithGoogle } from "../../../src/lib/auth/signin";
import { freshDb } from "../db/fixtures";

const CALLBACK = "http://localhost:3000/auth/callback";
const NOW = Date.parse("2026-10-04T08:00:00Z");

function fakeClient(
	exchange: () => Promise<{ error: AuthError | null }> = async () => ({ error: null }),
	session: { user: { id: string } } | null = null
) {
	const calls: string[] = [];
	const client = {
		auth: {
			getSession: async () => ({ data: { session }, error: null }),
			exchangeCodeForSession: async (code: string) => {
				calls.push(`exchange:${code}`);
				return exchange();
			},
			signInWithOAuth: async () => (calls.push("oauth"), { error: null }),
			signInWithOtp: async () => (calls.push("otp"), { error: null })
		}
	} as unknown as SupabaseClient;
	return { client, calls };
}

describe("finishing the sign-in callback", () => {
	test("a cancelled Google sign-in returns quietly without exchanging anything", async () => {
		const { client, calls } = fakeClient();
		expect(
			await finishCallback(
				client,
				`${CALLBACK}?error=access_denied&error_description=cancelled`
			)
		).toEqual({
			status: "cancelled"
		});
		expect(calls).toEqual([]);
	});
	test("a callback without a code, or with another error, fails", async () => {
		const { client } = fakeClient();
		expect(await finishCallback(client, CALLBACK)).toEqual({
			status: "failed",
			reason: "error"
		});
		expect(await finishCallback(client, `${CALLBACK}?error=server_error`)).toEqual({
			status: "failed",
			reason: "error"
		});
	});
	test("a code opened in another browser fails and points to the emailed code", async () => {
		const { client } = fakeClient(async () => ({
			error: new AuthError("verifier missing", 400, "pkce_code_verifier_not_found")
		}));
		expect(await finishCallback(client, `${CALLBACK}?code=abc`)).toEqual({
			status: "failed",
			reason: "otherBrowser"
		});
	});
	test("a callback opened again after signing in reports the session, not a failure", async () => {
		const { client } = fakeClient(
			async () => ({
				error: new AuthError("verifier missing", 400, "pkce_code_verifier_not_found")
			}),
			{ user: { id: "user-a" } }
		);
		expect(await finishCallback(client, `${CALLBACK}?code=abc`)).toEqual({ status: "ok" });
	});
	test("a valid code is exchanged for a session", async () => {
		const { client, calls } = fakeClient();
		expect(await finishCallback(client, `${CALLBACK}?code=abc`)).toEqual({ status: "ok" });
		expect(calls).toEqual(["exchange:abc"]);
	});
});

describe("consent before sign-in", () => {
	test("Google and the email code wait for the privacy consent", async () => {
		const db = freshDb();
		const { client, calls } = fakeClient();
		expect(await signInWithGoogle(db, client, CALLBACK, NOW)).toEqual({
			status: "consentRequired"
		});
		expect(
			await requestEmailCode(db, client, "a@test.terka", undefined, CALLBACK, NOW)
		).toEqual({
			status: "consentRequired"
		});
		expect(calls).toEqual([]);
		await acceptPolicy(db, "2026-10-01", NOW);
		expect(await signInWithGoogle(db, client, CALLBACK, NOW)).toEqual({ status: "ok" });
		expect(
			await requestEmailCode(db, client, "a@test.terka", undefined, CALLBACK, NOW)
		).toEqual({
			status: "ok"
		});
		expect(calls).toEqual(["oauth", "otp"]);
	});
	test("a consent accepted over an hour ago is asked for again", async () => {
		const db = freshDb();
		const { client, calls } = fakeClient();
		await acceptPolicy(db, "2026-10-01", NOW - 61 * 60_000);
		expect(await signInWithGoogle(db, client, CALLBACK, NOW)).toEqual({
			status: "consentRequired"
		});
		expect(
			await requestEmailCode(db, client, "a@test.terka", undefined, CALLBACK, NOW)
		).toEqual({
			status: "consentRequired"
		});
		expect(calls).toEqual([]);
	});
});
