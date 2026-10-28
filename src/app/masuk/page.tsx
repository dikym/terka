"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/shell/site-header";
import { OtherAccount, SignInForm, SignInSkeleton } from "@/components/screens/sign-in";
import { useSignIn } from "@/components/screens/use-sign-in";
import { useAccount, useReady } from "@/lib/app/use-runtime";
import { leaveLogin, peekReturnTo } from "@/lib/auth/return-to";
import { showToast } from "@/lib/toasts";

const ACCOUNT = "/setelan/akun";

export default function Page() {
	const router = useRouter();
	// Read once: a later visit to the privacy policy and back must not lose it.
	const [remembered] = useState(() => peekReturnTo());
	const destination = remembered ?? ACCOUNT;
	const { runtime } = useReady();
	const account = useAccount();
	const { signIn, conflict } = useSignIn(runtime, destination, (message) => {
		if (message) showToast({ tone: "success", text: message, key: "signIn" });
		leaveLogin(router, destination);
	});

	// Only someone already signed in when the page opens is sent on. A sign-in finishing here
	// navigates itself, after the device's data has been claimed.
	const decided = useRef(false);
	useEffect(() => {
		if (!account.known || decided.current) return;
		decided.current = true;
		if (account.email) leaveLogin(router, destination);
	}, [account, destination, router]);

	const waiting = !account.known || !!account.email;
	return (
		<>
			<SiteHeader signIn={false} />
			<main className="flex min-h-dvh flex-col items-center px-4 pt-15.25 pb-6 lg:pt-17.25 lg:pb-10">
				<div className="flex w-full max-w-md flex-1 flex-col gap-6 py-6 lg:justify-center lg:py-10">
					<div className="flex flex-col gap-2">
						<h1 className="type-screen-title">Masuk</h1>
						<p className="text-ink-900 type-body">
							Belum punya akun? Masuk dengan Google atau email, akun dibuat otomatis.
						</p>
					</div>
					{signIn && !waiting ? <SignInForm signIn={signIn} /> : <SignInSkeleton />}
				</div>
				{conflict && <OtherAccount onBack={conflict.onBack} onWipe={conflict.onWipe} />}
			</main>
		</>
	);
}
