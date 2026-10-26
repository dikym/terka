"use client";

import { useMemo } from "react";
import { MasteryMapScreen } from "@/components/screens/stats-detail";
import { useAppState, useReady } from "@/lib/app/use-runtime";
import { mapProvinces } from "@/lib/view/map";
import { masteryByGroup } from "@/lib/view/stats";

export default function Page() {
	const { runtime } = useReady();
	const app = useAppState(runtime);
	const view = useMemo(
		() =>
			runtime && app
				? {
						provinces: mapProvinces(app.log.state, runtime.bundle),
						rows: masteryByGroup(app.log.state, runtime.bundle)
					}
				: { provinces: {}, rows: null },
		[runtime, app]
	);
	return <MasteryMapScreen provinces={view.provinces} rows={view.rows} />;
}
