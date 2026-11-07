"use client";

import { useRef, useState } from "react";
import { ConfirmDialog, DangerConfirm, TypedConfirm } from "@/components/ui/dialog";
import { announceChange, authClient, syncOnce } from "@/lib/app/auth";
import type { Runtime } from "@/lib/app/runtime";
import { downloadExport, importFile } from "@/lib/app/transfer";
import { deleteAccount, removeDevice, resetProgress, signOut } from "@/lib/auth/account";
import { showToast } from "@/lib/toasts";
import { importMessage } from "@/lib/view/account";

const NOT_SAVED = "Perubahan belum tersimpan. Coba lagi.";
type Work = "export" | "import" | "signOut" | "device" | "reset" | "delete";

/**
 * Export, import, sign-out and account deletion, shared by the account menu and the account
 * screen. Render `dialogs` once: it holds the file picker and whichever confirmation is open.
 */
export function useAccountActions(runtime: Runtime | null, onChange?: () => void) {
	const [dialog, setDialog] = useState<
		| { kind: "confirmSignOut" }
		| { kind: "signOut"; pending: number }
		| { kind: "reset" }
		| { kind: "delete" }
		| { kind: "device"; id: string; name: string }
		| null
	>(null);
	const [working, setWorking] = useState<Work | null>(null);
	const file = useRef<HTMLInputElement>(null);
	const auth = authClient();

	const during = async (work: Work, task: () => Promise<unknown>) => {
		setWorking(work);
		try {
			await task();
		} finally {
			setWorking(null);
		}
	};
	const exportData = async () => {
		if (!runtime) return;
		await downloadExport(runtime);
		showToast({ tone: "success", text: "Data diekspor", key: "export" });
		onChange?.();
	};

	const leave = async (confirmed: boolean) => {
		if (!runtime || !auth) return;
		const result = await signOut(runtime.db, auth.client, { confirmed, now: Date.now() });
		if (result.status === "pending")
			return setDialog({ kind: "signOut", pending: result.count });
		setDialog(null);
		await runtime.reload();
		onChange?.();
	};

	const dialogs = (
		<>
			<input
				ref={file}
				type="file"
				accept="application/json,.json"
				className="hidden"
				onChange={(event) => {
					const chosen = event.target.files?.[0];
					event.target.value = "";
					if (!chosen || !runtime) return;
					void during("import", async () => {
						const message = importMessage(await importFile(runtime, chosen));
						showToast({
							tone: message.tone === "success" ? "success" : "danger",
							text: message.text,
							key: "import"
						});
						onChange?.();
					});
				}}
			/>
			{dialog?.kind === "confirmSignOut" && (
				<DangerConfirm
					title="Keluar dari akun?"
					busy={working === "signOut"}
					cancel={{ label: "Batal", onClick: () => setDialog(null) }}
					confirm={{
						label: "Keluar",
						busyLabel: "Keluar",
						onClick: () => void during("signOut", () => leave(false))
					}}
				>
					Keluar menyelesaikan sinkronisasi lebih dulu, lalu menghapus data dari perangkat
					ini.
				</DangerConfirm>
			)}
			{dialog?.kind === "signOut" && (
				<ConfirmDialog
					title="Keluar"
					safe={{
						label: "Sinkronkan dulu",
						icon: "cloud-upload",
						onClick: () => {
							setDialog(null);
							if (runtime) void syncOnce(runtime).then(onChange);
						}
					}}
					busy={working === "signOut"}
					destructive={{
						label: "Keluar",
						busyLabel: "Keluar",
						onClick: () => void during("signOut", () => leave(true))
					}}
				>
					{dialog.pending} perubahan belum tersinkron. Keluar sekarang akan menghapusnya
					dari perangkat ini.
				</ConfirmDialog>
			)}
			{dialog?.kind === "device" && (
				<DangerConfirm
					title="Hapus perangkat"
					busy={working === "device"}
					cancel={{ label: "Batal", onClick: () => setDialog(null) }}
					confirm={{
						label: "Hapus",
						busyLabel: "Menghapus",
						onClick: () => {
							const { id, name } = dialog;
							if (!runtime || !auth) return setDialog(null);
							void during("device", async () => {
								const result = await removeDevice(
									runtime.db,
									auth.client,
									id,
									Date.now()
								);
								// An open removed device syncs on the nudge and leaves at once.
								if (result.status === "ok") announceChange();
								setDialog(null);
								showToast(
									result.status === "ok"
										? {
												tone: "success",
												text: `${name} sudah dikeluarkan dari akun`
											}
										: {
												tone: "danger",
												text: "Perangkat belum terhapus. Coba lagi."
											}
								);
								onChange?.();
							});
						}
					}}
				>
					{dialog.name} akan keluar dari akun ini dan data di perangkat itu dihapus,
					termasuk perubahan yang belum tersinkron. Riwayat latihan yang sudah tersinkron
					tetap ada di akun.
				</DangerConfirm>
			)}
			{dialog?.kind === "reset" && (
				<TypedConfirm
					title="Reset progres"
					word="RESET"
					confirmLabel="Reset"
					busy={working === "reset"}
					busyLabel="Mereset"
					onCancel={() => setDialog(null)}
					onConfirm={() => {
						if (!runtime) return setDialog(null);
						void during("reset", async () => {
							const result = await resetProgress(runtime.db, auth?.client ?? null);
							if (result.status === "ok") {
								await runtime.reload();
								announceChange();
							}
							setDialog(null);
							showToast(
								result.status === "ok"
									? {
											tone: "success",
											label: "Progres",
											text: "Progres direset. Kamu mulai dari awal."
										}
									: { tone: "danger", text: NOT_SAVED }
							);
							onChange?.();
						});
					}}
				>
					Ketik RESET untuk menghapus seluruh riwayat latihan, catatan, dan setelan di
					semua perangkat akunmu. Akun tetap ada. Ekspor data dulu kalau kamu mau
					menyimpannya.
				</TypedConfirm>
			)}
			{dialog?.kind === "delete" && (
				<TypedConfirm
					title="Hapus akun"
					word="HAPUS"
					confirmLabel="Hapus"
					busy={working === "delete"}
					busyLabel="Menghapus"
					onCancel={() => setDialog(null)}
					onConfirm={() => {
						if (!runtime || !auth) return setDialog(null);
						void during("delete", async () => {
							const result = await deleteAccount(runtime.db, auth.client);
							setDialog(null);
							showToast(
								result.status === "ok"
									? {
											tone: "success",
											label: "Akun",
											text: "Akun dan data sinkron sudah dihapus. Data di perangkat ini tetap ada."
										}
									: { tone: "danger", text: NOT_SAVED }
							);
							onChange?.();
						});
					}}
				>
					Ketik HAPUS untuk menghapus akun dan seluruh data sinkron.
				</TypedConfirm>
			)}
		</>
	);

	return {
		exportData: () => void during("export", exportData),
		importData: () => file.current?.click(),
		signOut: () => setDialog({ kind: "confirmSignOut" }),
		resetProgress: () => setDialog({ kind: "reset" }),
		deleteAccount: () => setDialog({ kind: "delete" }),
		removeDevice: (id: string, name: string) => setDialog({ kind: "device", id, name }),
		working,
		dialogs
	};
}
