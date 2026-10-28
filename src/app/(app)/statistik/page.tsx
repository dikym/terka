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
	useSyncLabel
} from "@/lib/app/use-runtime";
import { openLogin } from "@/lib/auth/return-to";
import { mapProvinces } from "@/lib/view/map";
import { statsView } from "@/lib/view/stats";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const syncLabel = useSyncLabel(runtime);
	const lastSyncLabel = useLastSyncLabel(runtime);
	const { email } = useAccount();
	const router = useRouter();
	const [syncing, setSyncing] = useState(false);
	const syncIcon = useSyncIcon(runtime, syncing);
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
			syncing={syncing}
			onSync={sync}
			onLogin={() => openLogin(router)}
		/>
	);
}
