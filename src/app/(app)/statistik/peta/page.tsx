"use client";

import { useMemo } from "react";
import { PetaPenguasaan } from "@/components/screens/statistik-sub";
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
	return <PetaPenguasaan provinces={view.provinces} rows={view.rows} />;
}
