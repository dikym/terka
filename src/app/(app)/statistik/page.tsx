"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { StatsScreen } from "@/components/screens/stats";
import { syncOnce } from "@/lib/app/auth";
import { sessionCtx } from "@/lib/app/runtime";
import {
	useAccount,
	useAppState,
	useLastSyncLabel,
	useReady,
	useSyncIcon,
	useSyncLabel,
	useSyncRunning
} from "@/lib/app/use-runtime";
import { mapProvinces } from "@/lib/view/map";
import { statsView } from "@/lib/view/stats";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const lastSyncLabel = useLastSyncLabel(runtime);
	const { email } = useAccount();
	const router = useRouter();
	const [syncing, setSyncing] = useState(false);
	const running = useSyncRunning();
	const busy = syncing || running;
	const syncLabel = useSyncLabel(runtime, busy);
	const syncIcon = useSyncIcon(runtime, busy);
	const sync = () => {
		if (!runtime || syncing) return;
		setSyncing(true);
		void syncOnce(runtime).finally(() => setSyncing(false));
	};

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
	return (
		<StatsScreen
			data={data}
			provinces={provinces}
			syncLabel={syncLabel}
			lastSyncLabel={lastSyncLabel}
			syncIcon={syncIcon}
			signedIn={email !== null}
			syncing={busy}
			onSync={sync}
			onLogin={() => router.push("/masuk")}
		/>
	);
}
