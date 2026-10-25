"use client";

import { useMemo } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { Referensi } from "@/components/screens/referensi";
import { sightingEvent } from "@/core/session/commands";
import { todayOf } from "@/core/session/context";
import { lastDayOf, sessionCtx } from "@/lib/app/runtime";
import { useAppState, usePrefs, useReady } from "@/lib/app/use-runtime";
import { lastSightingAt } from "@/lib/db/log";
import { sightingCode } from "@/lib/view/reference";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const data = useMemo(
		() =>
			runtime && app && prefs
				? {
						bundle: runtime.bundle,
						state: app.log.state,
						today: todayOf(sessionCtx(runtime)),
						notes: prefs.notes
					}
				: null,
		[runtime, app, prefs]
	);
	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	// Only a region's front code is kept; sightingEvent drops the rest and repeats within its window.
	const record = async (query: string) => {
		if (!runtime) return;
		const code = sightingCode(runtime.bundle, query);
		const region = runtime.bundle.regions.find((item) => item.code === code);
		if (!region) return;
		const state = runtime.store.getState().log.state;
		const ctx = sessionCtx(runtime);
		const event = sightingEvent(
			query,
			runtime.bundle,
			ctx,
			await lastSightingAt(runtime.db, region.id, runtime.deviceId),
			lastDayOf(state)
		);
		if (event) await runtime.store.record([event]);
	};
	return <Referensi data={data} onQuery={(query) => void record(query)} />;
}
