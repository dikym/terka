"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Session } from "@/components/screens/sesi/session";
import { modeFromParam } from "@/dummy/session";

function SessionRoute() {
	const mode = modeFromParam(useSearchParams().get("mode"));
	// A new mode is a new session: remount instead of carrying state across.
	return <Session key={mode} mode={mode} />;
}

export default function Page() {
	return (
		<Suspense>
			<SessionRoute />
		</Suspense>
	);
}
