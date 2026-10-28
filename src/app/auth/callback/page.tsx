"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OtherAccount } from "@/components/screens/sign-in";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/app/auth";
import { useReady } from "@/lib/app/use-runtime";
import { takeReturnTo } from "@/lib/auth/return-to";
import { afterSignIn, finishCallback, switchAccount } from "@/lib/auth/signin";
import { showToast } from "@/lib/toasts";
import { mergedMessage } from "@/lib/view/account";

const ACCOUNT = "/statistik/akun";

type Outcome = { kind: "message"; text: string } | { kind: "otherAccount" } | null;

export default function Page() {
	const router = useRouter();
	const { runtime } = useReady();
	const [outcome, setOutcome] = useState<Outcome>(null);
	const started = useRef(false);

	useEffect(() => {
		const auth = authClient();
		if (!runtime || started.current) return;
		started.current = true;
		if (!auth) {
			void Promise.resolve().then(() =>
				setOutcome({ kind: "message", text: "Masuk belum tersedia di versi ini." })
			);
			return;
		}
		void (async () => {
			const result = await finishCallback(auth.client, location.href);
			// The code is single-use; a reload must not try it again.
			history.replaceState(null, "", location.pathname);
			if (result.status === "cancelled") return router.replace("/masuk");
			if (result.status === "failed")
				return setOutcome({
					kind: "message",
					text:
						result.reason === "otherBrowser"
							? "Masuk harus diselesaikan di browser yang sama. Masuk dengan kode email dari halaman masuk."
							: "Masuk dengan Google gagal. Coba lagi, atau masuk dengan email."
				});
			const signed = await afterSignIn(runtime.db, auth.client, Date.now());
			if (signed.status === "otherAccount") return setOutcome({ kind: "otherAccount" });
			if (signed.status !== "ok")
				return setOutcome({ kind: "message", text: "Masuk belum berhasil. Coba lagi." });
			await runtime.reload();
			showToast({ tone: "success", text: mergedMessage(signed.answers), key: "signIn" });
			router.replace(takeReturnTo() ?? ACCOUNT);
		})();
	}, [runtime, router]);

	const auth = authClient();
	return (
		<main className="container flex flex-col gap-5 py-10">
			{outcome?.kind === "otherAccount" && runtime && auth ? (
				<OtherAccount
					onBack={() =>
						void auth.client.auth
							.signOut({ scope: "local" })
							.then(() => router.replace("/masuk"))
					}
					onWipe={() =>
						void switchAccount(runtime.db, auth.client, Date.now()).then(async () => {
							await runtime.reload();
							router.replace(takeReturnTo() ?? ACCOUNT);
						})
					}
				/>
			) : (
				<Card>
					<CardHeader label="Akun" title="Masuk" />
					<p className="text-ink-900 type-body">
						{outcome?.kind === "message" ? outcome.text : "Menyelesaikan masuk…"}
					</p>
					{outcome && (
						<Button block href="/masuk">
							Kembali ke halaman masuk
						</Button>
					)}
				</Card>
			)}
		</main>
	);
}
