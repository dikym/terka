"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountScreen, type AccountView } from "@/components/screens/account";
import { AppFailed } from "@/components/screens/app-status";
import { useAccountContext } from "@/components/shell/account-provider";
import { exportReminderDue } from "@/core/views/notices";
import { sessionCtx } from "@/lib/app/runtime";
import { downloadExport, lastExportAt } from "@/lib/app/transfer";
import { type DeviceInfo, listDevices } from "@/lib/db/device";
import {
	useAccount,
	useAppState,
	useNow,
	useReady,
	useSyncIcon,
	useSyncLabel,
	useSyncRunning
} from "@/lib/app/use-runtime";
import { openLogin } from "@/lib/auth/return-to";
import { showToast } from "@/lib/toasts";
import { deviceRows, exportLabel } from "@/lib/view/account";
import { EXPORT_REMINDER_DAYS } from "@/rules";

export default function Page() {
	const router = useRouter();
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const account = useAccount();
	const syncing = useSyncRunning();
	const syncLabel = useSyncLabel(runtime, syncing);
	const syncIcon = useSyncIcon(runtime, syncing);
	const now = useNow();
	const { actions, revision, refresh } = useAccountContext();
	const [exported, setExported] = useState<number | null | undefined>(undefined);
	const [counts, setCounts] = useState({ pending: 0 });
	const [devices, setDevices] = useState<DeviceInfo[] | null>(null);

	useEffect(() => {
		if (!runtime) return;
		void lastExportAt(runtime).then(setExported);
		void runtime.db.outbox.count().then((pending) => setCounts({ pending }));
		void listDevices(runtime.db).then(setDevices);
	}, [runtime, app, revision]);

	const tz = runtime ? sessionCtx(runtime).tz : "UTC";
	const backupDue =
		!!app &&
		!!now &&
		exported !== undefined &&
		exportReminderDue(app.log.state, exported, now, tz);
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
				onClick: () => void downloadExport(runtime).then(refresh)
			}
		});
	}, [backupDue, runtime, refresh]);

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;

	const rows = runtime && now && devices ? deviceRows(devices, runtime.deviceId, now) : null;
	const view: AccountView =
		!runtime || !account.known || !rows
			? { kind: "loading" }
			: account.email
				? {
						kind: "member",
						page: {
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
							syncIcon,
							devices: `${rows.length} perangkat`,
							deviceRows: rows
						}
					}
				: { kind: "guest" };

	return (
		<AccountScreen
			view={view}
			lastExport={now && exported !== undefined ? exportLabel(exported, now) : null}
			actions={actions}
			onLogin={() => openLogin(router)}
		/>
	);
}
