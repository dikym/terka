"use client";

import { useState, useSyncExternalStore } from "react";
import type { SignIn } from "@/components/screens/sign-in";
import { authClient } from "@/lib/app/auth";
import type { Runtime } from "@/lib/app/runtime";
import { isInAppBrowser } from "@/lib/auth/browsers";
import { acceptPolicy } from "@/lib/auth/consent";
import { rememberReturnTo } from "@/lib/auth/return-to";
import {
	afterSignIn,
	requestEmailCode,
	signInWithGoogle,
	switchAccount,
	verifyEmailCode
} from "@/lib/auth/signin";
import { mergedMessage } from "@/lib/view/account";
import { PRIVACY_POLICY_VERSION } from "@/rules";

const CODE_RESULT = {
	tooSoon: "Belum menerima email? Cek folder spam, atau kirim ulang sebentar lagi.",
	captchaFailed: "Pemeriksaan keamanan gagal. Coba lagi.",
	failed: "Kode masuk belum terkirim. Coba lagi.",
	consentRequired: "Setujui kebijakan privasi dulu untuk masuk."
};

function subscribeOnline(listener: () => void) {
	window.addEventListener("online", listener);
	window.addEventListener("offline", listener);
	return () => {
		window.removeEventListener("online", listener);
		window.removeEventListener("offline", listener);
	};
}
const noSubscribe = () => () => {};

/**
 * The sign-in handlers for `SignInForm`. `onDone` runs once an email code has signed in, or the
 * local data was reset for the new account, with the message worth showing (or null).
 */
export function useSignIn(
	runtime: Runtime | null,
	destination: string,
	onDone: (message: string | null) => void
) {
	const online = useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true
	);
	const inApp = useSyncExternalStore(
		noSubscribe,
		() => isInAppBrowser(navigator.userAgent),
		() => false
	);
	const [otherAccount, setOtherAccount] = useState(false);
	const auth = authClient();

	const finish = async () => {
		if (!runtime || !auth) return null;
		const result = await afterSignIn(runtime.db, auth.client, Date.now());
		if (result.status === "otherAccount") {
			setOtherAccount(true);
			return null;
		}
		if (result.status !== "ok") return "Masuk belum berhasil. Coba lagi.";
		await runtime.reload();
		onDone(mergedMessage(result.answers));
		return null;
	};

	const signIn: SignIn | null =
		runtime && auth
			? {
					blocked: online ? null : "Masuk memerlukan koneksi internet.",
					inApp,
					accept: () => acceptPolicy(runtime.db, PRIVACY_POLICY_VERSION, Date.now()),
					async google() {
						rememberReturnTo(destination);
						const result = await signInWithGoogle(
							runtime.db,
							auth.client,
							`${location.origin}/auth/callback`,
							Date.now()
						);
						if (result.status === "consentRequired") return CODE_RESULT.consentRequired;
						return result.status === "failed"
							? "Masuk dengan Google gagal. Coba lagi, atau masuk dengan email."
							: null;
					},
					async sendCode(email) {
						const result = await requestEmailCode(
							runtime.db,
							auth.client,
							email,
							undefined,
							`${location.origin}/auth/callback`,
							Date.now()
						);
						return result.status === "ok" ? null : CODE_RESULT[result.status];
					},
					async verify(email, code) {
						const result = await verifyEmailCode(auth.client, email, code);
						if (result.status === "invalid")
							return "Kode tidak cocok. Periksa lagi, atau kirim kode baru.";
						if (result.status === "failed") return "Masuk belum berhasil. Coba lagi.";
						return finish();
					}
				}
			: runtime
				? {
						blocked: "Masuk belum tersedia di versi ini.",
						inApp,
						accept: async () => {},
						google: async () => null,
						sendCode: async () => null,
						verify: async () => null
					}
				: null;

	const conflict =
		otherAccount && runtime && auth
			? {
					onBack: () => {
						void auth.client.auth.signOut({ scope: "local" });
						setOtherAccount(false);
					},
					onWipe: () =>
						void switchAccount(runtime.db, auth.client, Date.now()).then(async () => {
							await runtime.reload();
							setOtherAccount(false);
							onDone(null);
						})
				}
			: null;

	return { signIn, conflict };
}
