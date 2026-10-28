"use client";

import { useMemo } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { StatsScreen } from "@/components/screens/stats";
import { sessionCtx } from "@/lib/app/runtime";
import { useAppState, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { mapProvinces } from "@/lib/view/map";
import { statsView } from "@/lib/view/stats";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const syncLabel = useSyncLabel(runtime);

	const data = useMemo(() => {
		if (!runtime || !app) return null;
		return statsView(app.log.state, runtime.bundle, sessionCtx(runtime));
	}, [runtime, app]);
	const provinces = useMemo(
		() => (runtime && app ? mapProvinces(app.log.state, runtime.bundle) : {}),
		[runtime, app]
	);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	return <StatsScreen data={data} provinces={provinces} syncLabel={syncLabel} />;
}
