"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Session } from "@/components/screens/sesi/session";
import { modeFromParam } from "@/lib/session/modes";
import { parseScope } from "@/lib/view/groups";

function SessionRoute() {
	const search = useSearchParams();
	const mode = modeFromParam(search.get("mode"));
	const scope = search.get("scope");
	const code = search.get("code");
	const params = useMemo(() => ({ scope: parseScope(scope), code }), [scope, code]);
	// A new mode or region is a new session: remount instead of carrying state across.
	return <Session key={`${mode}|${scope}|${code}`} mode={mode} params={params} />;
}

export default function Page() {
	return (
		<Suspense>
			<SessionRoute />
		</Suspense>
	);
}
