"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { OtherAccount, type SignIn } from "@/components/screens/akun-masuk";
import { useAccountActions } from "@/components/screens/account-actions";
import { Akun } from "@/components/screens/statistik-sub";
import { exportReminderDue } from "@/core/views/notices";
import { authClient } from "@/lib/app/auth";
import { sessionCtx } from "@/lib/app/runtime";
import { downloadExport, lastExportAt } from "@/lib/app/transfer";
import { useAccount, useAppState, useNow, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { isInAppBrowser } from "@/lib/auth/browsers";
import { acceptPolicy } from "@/lib/auth/consent";
import {
	afterSignIn,
	requestEmailCode,
	signInWithGoogle,
	switchAccount,
	verifyEmailCode
} from "@/lib/auth/signin";
import { showToast } from "@/lib/toasts";
import { exportLabel } from "@/lib/view/account";
import { count } from "@/lib/view/format";
import { EXPORT_REMINDER_DAYS, PRIVACY_POLICY_VERSION } from "@/rules";

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

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const account = useAccount();
	const syncLabel = useSyncLabel(runtime);
	const now = useNow();
	const [exported, setExported] = useState<number | null>(null);
	const [counts, setCounts] = useState({ pending: 0, devices: 1 });
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
	const [refreshed, setRefreshed] = useState(0);
	const actions = useAccountActions(runtime, () => setRefreshed((value) => value + 1));

	useEffect(() => {
		if (!runtime) return;
		void lastExportAt(runtime).then(setExported);
		void Promise.all([runtime.db.outbox.count(), runtime.db.devices.count()]).then(
			([pending, devices]) => setCounts({ pending, devices })
		);
	}, [runtime, app, refreshed]);

	const tz = runtime ? sessionCtx(runtime).tz : "UTC";
	const backupDue = !!app && !!now && exportReminderDue(app.log.state, exported, now, tz);
	useEffect(() => {
		if (!backupDue || !runtime) return;
		showToast({
			tone: "warn",
			label: "Cadangan",
			icon: "hard-drive",
			text: `Ekspor terakhir sudah lebih dari ${EXPORT_REMINDER_DAYS} hari.`,
			key: "backup",
			action: {
				label: "Ekspor data",
				icon: "download",
				onClick: () =>
					void downloadExport(runtime).then(() => setRefreshed((value) => value + 1))
			}
		});
	}, [backupDue, runtime]);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
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
		return `Riwayat di perangkat ini digabung ke akun. ${count(result.answers)} jawaban ditambahkan.`;
	};

	const signIn: SignIn | null =
		runtime && auth
			? {
					blocked: online ? null : "Masuk memerlukan koneksi internet.",
					inApp,
					accept: () => acceptPolicy(runtime.db, PRIVACY_POLICY_VERSION, Date.now()),
					async google() {
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

	return (
		<>
			<Akun
				page={
					account.email
						? {
								email: account.email,
								provider:
									account.provider === "google"
										? "Masuk dengan Google"
										: "Masuk dengan email",
								pending: counts.pending
									? `${counts.pending} perubahan menunggu sinkronisasi`
									: "Semua perubahan sudah terkirim",
								pendingNote: counts.pending ? "dikirim beberapa detik lagi" : null,
								synced: syncLabel ?? "",
								devices: `${counts.devices} perangkat`
							}
						: null
				}
				lastExport={now ? exportLabel(exported, now) : null}
				signIn={signIn}
				actions={actions}
			/>
			{actions.dialogs}
			{otherAccount && runtime && auth && (
				<OtherAccount
					onBack={() => {
						void auth.client.auth.signOut({ scope: "local" });
						setOtherAccount(false);
					}}
					onWipe={() =>
						void switchAccount(runtime.db, auth.client, Date.now()).then(async () => {
							await runtime.reload();
							setOtherAccount(false);
						})
					}
				/>
			)}
		</>
	);
}
