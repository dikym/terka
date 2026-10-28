"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/app/auth";
import { useAccount } from "@/lib/app/use-runtime";

/**
 * Whether someone is signed in; null until the stored session is read. The landing page does not
 * open the app runtime, so the session is read here instead of waiting for the account store.
 */
function useSignedIn(): boolean | null {
	const { known, email } = useAccount();
	const [stored, setStored] = useState<boolean | null>(null);
	useEffect(() => {
		const auth = authClient();
		const session = auth
			? auth.client.auth.getSession().then(({ data }) => data.session !== null)
			: Promise.resolve(false);
		void session.catch(() => false).then(setStored);
	}, []);
	return known ? email !== null : stored;
}

/** The one button of the public header: Masuk until someone is signed in, then Buka aplikasi. */
export function SiteHeaderAction({ signIn }: { signIn: boolean }) {
	const signedIn = useSignedIn();
	if (signIn && !signedIn)
		return (
			<Button href="/masuk" size="sm">
				Masuk
			</Button>
		);
	return (
		<Button href="/beranda" size="sm">
			Buka aplikasi
		</Button>
	);
}
