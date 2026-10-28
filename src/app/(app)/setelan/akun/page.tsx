"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountScreen, type AccountView } from "@/components/screens/account";
import { AppFailed } from "@/components/screens/app-status";
import { useAccountContext } from "@/components/shell/account-provider";
import { exportReminderDue } from "@/core/views/notices";
import { sessionCtx } from "@/lib/app/runtime";
import { downloadExport, lastExportAt } from "@/lib/app/transfer";
import { useAccount, useAppState, useNow, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { openLogin } from "@/lib/auth/return-to";
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
	const { actions, revision, refresh } = useAccountContext();
	const [exported, setExported] = useState<number | null | undefined>(undefined);
	const [counts, setCounts] = useState({ pending: 0, devices: 1 });

	useEffect(() => {
		if (!runtime) return;
		void lastExportAt(runtime).then(setExported);
		void Promise.all([runtime.db.outbox.count(), runtime.db.devices.count()]).then(
			([pending, devices]) => setCounts({ pending, devices })
		);
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

	const view: AccountView =
		!runtime || !account.known
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
							devices: `${counts.devices} perangkat`
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
