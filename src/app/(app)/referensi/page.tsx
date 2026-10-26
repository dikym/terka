"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { ReferenceScreen } from "@/components/screens/reference";
import { sightingEvent } from "@/core/session/commands";
import { todayOf } from "@/core/session/context";
import { lastDayOf, sessionCtx } from "@/lib/app/runtime";
import { useAppState, usePrefs, useReady } from "@/lib/app/use-runtime";
import { lastSightingAt } from "@/lib/db/log";
import { sightingCode } from "@/lib/view/reference";

function ReferenceRoute() {
	const search = useSearchParams();
	// Read once: the box and the view take over once the page is open.
	const [initial] = useState(() => ({
		kode: search.get("kode"),
		cari: search.get("cari"),
		provinsi: search.get("provinsi"),
		kawasan: search.get("kawasan")
	}));
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
	return (
		<ReferenceScreen data={data} initial={initial} onQuery={(query) => void record(query)} />
	);
}

const NO_ENTRY = { kode: null, cari: null, provinsi: null, kawasan: null };

export default function Page() {
	// The static page has no address to read; it still ships the skeleton.
	return (
		<Suspense fallback={<ReferenceScreen data={null} initial={NO_ENTRY} onQuery={() => {}} />}>
			<ReferenceRoute />
		</Suspense>
	);
}
