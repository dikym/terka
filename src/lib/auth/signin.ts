import { isAuthError, type SupabaseClient } from "@supabase/supabase-js";
import { readMeta, type TerkaDb } from "@/lib/db/schema";
import { claimLocalData, wipeLocalData } from "./account";
import { freshConsent, recordConsent, type PendingConsent } from "./consent";

type Outcome<T extends string> = { status: T };

export async function signInWithGoogle(
	db: TerkaDb,
	client: SupabaseClient,
	redirectTo: string,
	now: number
): Promise<Outcome<"ok" | "failed" | "consentRequired">> {
	if (!(await freshConsent(db, now))) return { status: "consentRequired" };
	const { error } = await client.auth.signInWithOAuth({
		provider: "google",
		options: { redirectTo }
	});
	return { status: error ? "failed" : "ok" };
}

export async function requestEmailCode(
	db: TerkaDb,
	client: SupabaseClient,
	email: string,
	captchaToken: string | undefined,
	redirectTo: string,
	now: number
): Promise<Outcome<"ok" | "tooSoon" | "captchaFailed" | "failed" | "consentRequired">> {
	if (!(await freshConsent(db, now))) return { status: "consentRequired" };
	const { error } = await client.auth.signInWithOtp({
		email,
		options: { captchaToken, emailRedirectTo: redirectTo }
	});
	if (!error) return { status: "ok" };
	if (error.status === 429 || error.code === "over_email_send_rate_limit")
		return { status: "tooSoon" };
	if (error.code === "captcha_failed") return { status: "captchaFailed" };
	return { status: "failed" };
}

// The server reports a wrong code and an expired one the same way.
export async function verifyEmailCode(
	client: SupabaseClient,
	email: string,
	code: string
): Promise<Outcome<"ok" | "invalid" | "failed">> {
	const { error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
	if (!error) return { status: "ok" };
	return { status: error.code === "otp_expired" || error.status === 403 ? "invalid" : "failed" };
}

export async function finishCallback(
	client: SupabaseClient,
	url: string
): Promise<Outcome<"ok" | "cancelled"> | { status: "failed"; reason: "otherBrowser" | "error" }> {
	const params = new URL(url).searchParams;
	if (params.get("error") === "access_denied") return { status: "cancelled" };
	const code = params.get("code");
	if (params.get("error") || !code) return { status: "failed", reason: "error" };
	const { error } = await client.auth.exchangeCodeForSession(code);
	if (!error) return { status: "ok" };
	// A second exchange of the same code (a reload, a repeated effect) fails after the first succeeded.
	if ((await client.auth.getSession()).data.session) return { status: "ok" };
	// PKCE keeps the verifier in the browser that started sign-in; another browser cannot finish it.
	const otherBrowser = isAuthError(error) && error.code === "pkce_code_verifier_not_found";
	return { status: "failed", reason: otherBrowser ? "otherBrowser" : "error" };
}

export async function afterSignIn(
	db: TerkaDb,
	client: SupabaseClient,
	now: number
): Promise<
	{ status: "ok"; userId: string; answers: number } | Outcome<"otherAccount" | "signedOut">
> {
	const user = (await client.auth.getSession()).data.session?.user;
	if (!user) return { status: "signedOut" };
	const claimed = await claimLocalData(db, user.id);
	if (claimed.status === "otherAccount") return claimed;
	await recordConsent(db, now);
	return { status: "ok", userId: user.id, answers: claimed.answers };
}

// "Hapus data di perangkat ini": the previous account's data goes, the signed-in account claims the device.
export async function switchAccount(db: TerkaDb, client: SupabaseClient, now: number) {
	// The consent was given for the account now signed in, so it survives the wipe.
	const pending = await readMeta<PendingConsent>(db, "pendingConsent");
	await wipeLocalData(db);
	if (pending) await db.sync_meta.put({ key: "pendingConsent", value: pending });
	return afterSignIn(db, client, now);
}
