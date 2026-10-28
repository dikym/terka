"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { useAccountActions } from "@/components/screens/account-actions";
import { AccountScreen } from "@/components/screens/stats-detail";
import { exportReminderDue } from "@/core/views/notices";
import { sessionCtx } from "@/lib/app/runtime";
import { downloadExport, lastExportAt } from "@/lib/app/transfer";
import { useAccount, useAppState, useNow, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { loginHref } from "@/lib/auth/return-to";
import { showToast } from "@/lib/toasts";
import { exportLabel } from "@/lib/view/account";
import { EXPORT_REMINDER_DAYS } from "@/rules";

export default function Page() {
	const router = useRouter();
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const account = useAccount();
	const syncLabel = useSyncLabel(runtime);
	const now = useNow();
	const [exported, setExported] = useState<number | null>(null);
	const [counts, setCounts] = useState({ pending: 0, devices: 1 });
	const [refreshed, setRefreshed] = useState(0);
	const actions = useAccountActions(runtime, () => setRefreshed((value) => value + 1));

	useEffect(() => {
		if (account.known && !account.email) router.replace(loginHref("/statistik/akun"));
	}, [account, router]);

	useEffect(() => {
		if (!runtime) return;
		void lastExportAt(runtime).then(setExported);
		void Promise.all([runtime.db.outbox.count(), runtime.db.devices.count()]).then(
			([pending, devices]) => setCounts({ pending, devices })
		);
	}, [runtime, app, refreshed]);

	const tz = runtime ? sessionCtx(runtime).tz : "UTC";
	const backupDue = !!app && !!now && exportReminderDue(app.log.state, exported, now, tz);
	useEffect(() => {
		if (!backupDue || !runtime) return;
		showToast({
			tone: "warn",
			label: "Cadangan",
			icon: "hard-drive",
			text: `Ekspor terakhir sudah lebih dari ${EXPORT_REMINDER_DAYS} hari.`,
			key: "backup",
			action: {
				label: "Ekspor data",
				icon: "download",
				onClick: () =>
					void downloadExport(runtime).then(() => setRefreshed((value) => value + 1))
			}
		});
	}, [backupDue, runtime]);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;

	return (
		<>
			<AccountScreen
				page={
					runtime && account.email
						? {
								email: account.email,
								provider:
									account.provider === "google"
										? "Masuk dengan Google"
										: "Masuk dengan email",
								pending: counts.pending
									? `${counts.pending} perubahan menunggu sinkronisasi`
									: "Semua perubahan sudah terkirim",
								pendingNote: counts.pending ? "dikirim beberapa detik lagi" : null,
								synced: syncLabel ?? "",
								devices: `${counts.devices} perangkat`
							}
						: null
				}
				lastExport={now ? exportLabel(exported, now) : null}
				actions={actions}
			/>
			{actions.dialogs}
		</>
	);
}
