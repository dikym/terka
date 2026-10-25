"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { useAccountActions } from "@/components/screens/account-actions";
import { Statistik } from "@/components/screens/statistik";
import { Menu } from "@/components/ui/menu";
import { sessionCtx } from "@/lib/app/runtime";
import { lastExportAt } from "@/lib/app/transfer";
import { useAccount, useAppState, useNow, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { exportLabel } from "@/lib/view/account";
import { mapProvinces } from "@/lib/view/map";
import { statsView } from "@/lib/view/stats";

export default function Page() {
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const account = useAccount();
	const syncLabel = useSyncLabel(runtime);
	const now = useNow();
	const router = useRouter();
	const [exported, setExported] = useState<number | null | undefined>(undefined);
	const [changed, setChanged] = useState(0);
	const actions = useAccountActions(runtime, () => setChanged((value) => value + 1));
	useEffect(() => {
		if (runtime) void lastExportAt(runtime).then(setExported);
	}, [runtime, changed]);

	const data = useMemo(() => {
		if (!runtime || !app || syncLabel === null || exported === undefined || !now) return null;
		return statsView(app.log.state, runtime.bundle, sessionCtx(runtime), {
			email: account.email,
			sync: syncLabel,
			export: exportLabel(exported, now)
		});
	}, [runtime, app, account.email, syncLabel, exported, now]);
	const provinces = useMemo(
		() => (runtime && app ? mapProvinces(app.log.state, runtime.bundle) : {}),
		[runtime, app]
	);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	return (
		<>
			<Statistik
				data={data}
				provinces={provinces}
				syncLabel={syncLabel}
				onExport={actions.exportData}
				menu={
					runtime && (
						<Menu
							label="Akun"
							icon="user"
							entries={[
								{
									label: "Ekspor data",
									icon: "download",
									onSelect: actions.exportData
								},
								{
									label: "Impor data",
									icon: "upload",
									onSelect: actions.importData
								},
								"separator",
								...(account.email
									? [
											{
												label: "Keluar",
												icon: "log-out" as const,
												onSelect: actions.signOut
											},
											{
												label: "Hapus akun",
												icon: "x" as const,
												danger: true,
												onSelect: actions.deleteAccount
											}
										]
									: [
											{
												label: "Masuk",
												icon: "user" as const,
												onSelect: () => router.push("/statistik/akun")
											}
										])
							]}
						/>
					)
				}
			/>
			{actions.dialogs}
		</>
	);
}
