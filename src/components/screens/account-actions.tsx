"use client";

import { useRef, useState } from "react";
import { ConfirmDialog, DangerConfirm, TypedConfirm } from "@/components/ui/dialog";
import { authClient, syncOnce } from "@/lib/app/auth";
import type { Runtime } from "@/lib/app/runtime";
import { downloadExport, importFile } from "@/lib/app/transfer";
import { deleteAccount, removeDevice, signOut } from "@/lib/auth/account";
import { showToast } from "@/lib/toasts";
import { importMessage } from "@/lib/view/account";

const NOT_SAVED = "Perubahan belum tersimpan. Coba lagi.";

/**
 * Export, import, sign-out and account deletion, shared by the account menu and the account
 * screen. Render `dialogs` once: it holds the file picker and whichever confirmation is open.
 */
export function useAccountActions(runtime: Runtime | null, onChange?: () => void) {
	const [dialog, setDialog] = useState<
		| { kind: "signOut"; pending: number }
		| { kind: "delete" }
		| { kind: "device"; id: string; name: string }
		| null
	>(null);
	const file = useRef<HTMLInputElement>(null);
	const auth = authClient();

	const exportData = async () => {
		if (!runtime) return;
		await downloadExport(runtime);
		showToast({ tone: "success", text: "Data diekspor", key: "export" });
		onChange?.();
	};

	const leave = async (confirmed: boolean) => {
		if (!runtime || !auth) return;
		const result = await signOut(runtime.db, auth.client, { confirmed });
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
					void importFile(runtime, chosen).then((result) => {
						const message = importMessage(result);
						showToast({
							tone: message.tone === "success" ? "success" : "danger",
							text: message.text,
							key: "import"
						});
						onChange?.();
					});
				}}
			/>
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
					destructive={{ label: "Keluar", onClick: () => void leave(true) }}
				>
					{dialog.pending} perubahan belum tersinkron. Keluar sekarang akan menghapusnya
					dari perangkat ini.
				</ConfirmDialog>
			)}
			{dialog?.kind === "device" && (
				<DangerConfirm
					title="Hapus perangkat"
					cancel={{ label: "Batal", onClick: () => setDialog(null) }}
					confirm={{
						label: "Hapus",
						onClick: () => {
							const { id } = dialog;
							setDialog(null);
							if (!runtime || !auth) return;
							void removeDevice(runtime.db, auth.client, id, Date.now()).then(
								(result) => {
									showToast(
										result.status === "ok"
											? {
													tone: "success",
													text: "Perangkat dihapus dari daftar"
												}
											: {
													tone: "danger",
													text: "Perangkat belum terhapus. Coba lagi."
												}
									);
									onChange?.();
								}
							);
						}
					}}
				>
					{dialog.name} dihapus dari daftar perangkat akun ini. Riwayat latihan tidak ikut
					terhapus. Kalau perangkat itu masih dipakai, ia muncul lagi setelah sinkronisasi
					berikutnya.
				</DangerConfirm>
			)}
			{dialog?.kind === "delete" && (
				<TypedConfirm
					title="Hapus akun"
					word="HAPUS"
					confirmLabel="Hapus"
					onCancel={() => setDialog(null)}
					onConfirm={() => {
						setDialog(null);
						if (!runtime || !auth) return;
						void deleteAccount(runtime.db, auth.client).then((result) => {
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
		exportData: () => void exportData(),
		importData: () => file.current?.click(),
		signOut: () => void leave(false),
		deleteAccount: () => setDialog({ kind: "delete" }),
		removeDevice: (id: string, name: string) => setDialog({ kind: "device", id, name }),
		dialogs
	};
}
