"use client";

import { useEffect, useMemo, useState } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { ParamsScreen } from "@/components/screens/params";
import type { FsrsParams } from "@/core/log/events";
import { type CountedAnswer, countedAnswers } from "@/core/optimizer/counted";
import { sessionCtx } from "@/lib/app/runtime";
import { useAppState, useNow, useReady } from "@/lib/app/use-runtime";
import { readEvents } from "@/lib/db/log";
import { paramsView } from "@/lib/view/params";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const now = useNow();
	const [rows, setRows] = useState<FsrsParams[] | null>(null);
	const [counted, setCounted] = useState<CountedAnswer[] | null>(null);

	useEffect(() => {
		if (!runtime) return;
		let cancelled = false;
		void runtime.db.fsrs_params.toArray().then((loaded) => {
			if (!cancelled) setRows(loaded);
		});
		// Counting the answers replays the whole log, so it waits for the skeleton to paint.
		const timer = setTimeout(() => {
			void readEvents(runtime.db).then((events) => {
				if (!cancelled) setCounted(countedAnswers(events, runtime.bundle));
			});
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [runtime]);

	const data = useMemo(() => {
		if (!runtime || !app || !rows || !now) return null;
		return paramsView(app.log.state.params, rows, counted, now, sessionCtx(runtime).tz);
	}, [runtime, app, rows, counted, now]);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	return <ParamsScreen data={data} />;
}
