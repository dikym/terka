"use client";

import { useMemo } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { Setelan } from "@/components/screens/setelan";
import { sessionCtx } from "@/lib/app/runtime";
import { useAppState, useNow, usePrefs, useReady } from "@/lib/app/use-runtime";
import { settingsView } from "@/lib/view/settings";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const now = useNow();
	const data = useMemo(() => {
		if (!runtime || !app || !prefs || !now) return null;
		const { tz } = sessionCtx(runtime);
		return settingsView(
			app.log.state,
			runtime.bundle,
			prefs.settings,
			runtime.persisted,
			now,
			tz
		);
	}, [runtime, app, prefs, now]);
	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	return (
		<Setelan
			data={data}
			onDiplomatChange={(specialEnabled) => {
				if (runtime && prefs)
					void runtime.saveSettings({ ...prefs.settings, specialEnabled });
			}}
		/>
	);
}
