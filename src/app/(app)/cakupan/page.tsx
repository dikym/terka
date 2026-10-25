"use client";

import { useMemo } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { Cakupan, type Node } from "@/components/screens/cakupan";
import { NATIONAL } from "@/core/questions/distractors";
import { useAppState, usePrefs, useReady } from "@/lib/app/use-runtime";
import { coverageView } from "@/lib/view/coverage";
import { bundleGroup, scopeGroup } from "@/lib/view/groups";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const data = useMemo(
		() => (runtime && app ? coverageView(app.log.state, runtime.bundle) : null),
		[runtime, app]
	);
	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	// A province scope shows as its group: the tree picks groups only.
	const active: Node =
		runtime && prefs
			? (scopeGroup(runtime.bundle, prefs.settings.scope) ?? "national")
			: "national";
	const pick = (node: Node) => {
		if (!runtime || !prefs) return;
		void runtime.saveSettings({
			...prefs.settings,
			scope: node === "national" ? NATIONAL : { level: "group", id: bundleGroup(node) }
		});
	};
	return <Cakupan data={data} active={active} onPick={pick} />;
}
