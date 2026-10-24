"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Beranda } from "@/components/screens/beranda";
import { PerubahanData } from "@/components/screens/perubahan-data";
import { Sambutan } from "@/components/screens/sambutan";
import { CHALLENGE_DONE, useFlag, WELCOME_SEEN, writeFlag } from "@/dummy/flags";
import { home } from "@/dummy/home";
import { useDummy } from "@/dummy/use-dummy";

function Home() {
	const router = useRouter();
	const params = useSearchParams();
	const data = useDummy(home);
	const welcomeSeen = useFlag("local", WELCOME_SEEN, "1");
	const challengeDone = useFlag("session", CHALLENGE_DONE, null) === "1";
	const [dismissed, setDismissed] = useState(false);
	const welcome = welcomeSeen !== "1" && !dismissed;

	const dismiss = () => {
		writeFlag("local", WELCOME_SEEN, "1");
		setDismissed(true);
	};

	if (params.get("perubahan") === "1") return <PerubahanData onClose={() => router.push("/")} />;
	return (
		<>
			<Beranda data={data} challengeDone={challengeDone} />
			{welcome && (
				<Sambutan
					onStart={() => {
						dismiss();
						router.push("/sesi");
					}}
					onSkip={dismiss}
				/>
			)}
		</>
	);
}

export default function Page() {
	return (
		<Suspense>
			<Home />
		</Suspense>
	);
}
