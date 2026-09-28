"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useLearning, useNow } from "@/components/learning/learning-provider";
import { useBackupActions } from "@/components/learning/backup-actions";
import { backupStatus, manualBackup } from "@/lib/terka/backup";
import { dateLabel } from "@/lib/terka/practice";
import { Download, Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { LabelText } from "@/components/ui/label-text";
import { EXPORT_REMINDER_DAYS } from "@/rules";

export function BackupScreen() {
	const { progress, busy } = useLearning();
	const router = useRouter();
	const now = useNow();
	const input = useRef<HTMLInputElement>(null);
	const backup = useBackupActions();
	const status = backupStatus(progress, now);
	const backupWarning = {
		title: backup.downloaded
			? "Pastikan berkas sudah tersimpan."
			: progress.lastBackupAt === null
				? "Belum ada cadangan."
				: status.overdue
					? `Ekspor terakhir sudah lebih dari ${EXPORT_REMINDER_DAYS} hari.`
					: "Cadangan sudah diperbarui.",
		body: backup.downloaded
			? "Setelah unduhan tersimpan, tekan Berkas sudah tersimpan untuk mencatat cadangan ini."
			: (status.message ??
				"Data belajar tersimpan di perangkat ini. Simpan salinan cadangan di tempat aman.")
	};
	const destination = [
		{ label: "folder", value: backup.folder ?? "Unduhan manual" },
		{ label: "izin", value: backup.folder ? "Diperiksa saat menyimpan" : "Belum terhubung" },
		{ label: "jadwal", value: backup.folder ? "otomatis, mingguan" : "manual" },
		{
			label: "ukuran",
			value: `${Math.ceil(manualBackup(progress).size / 1024)} KB · ${progress.cards.length} kartu`
		}
	];
	const history = [
		{
			date: dateLabel(progress.lastBackupAt),
			kind: progress.lastBackupAt === null ? "belum ada" : "terakhir tersimpan"
		}
	];

	return (
		<>
			<input
				ref={input}
				type="file"
				accept=".json,application/json"
				hidden
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) void backup.restore(file);
				}}
			/>
			<header className="flex items-center border-b border-ink-200 bg-paper-0 px-5 py-4">
				<PageTitle
					back="/statistik"
					size="sm"
					className="flex-1"
					actions={
						<IconButton label="Setelan" onClick={() => router.push("/setelan")}>
							<Settings className="size-4.5" aria-hidden />
						</IconButton>
					}
				>
					Cadangan
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="lg:grid-cols-[minmax(0,1fr)_300px]"
					aside={
						<>
							<div className="flex flex-col gap-2">
								<LabelText>riwayat</LabelText>
								{history.map((entry) => (
									<div
										key={entry.date}
										className="flex items-center justify-between gap-3 border-t border-ink-200 py-2"
									>
										<span className="font-mono text-body-sm leading-none font-medium text-ink-1000">
											{entry.date}
										</span>
										<LabelText>{entry.kind}</LabelText>
									</div>
								))}
							</div>
							<Callout title="Tanpa server">
								Tidak ada akun dan tidak ada sinkronisasi. Berkas cadangan ini
								satu-satunya salinan di luar perangkat.
							</Callout>
						</>
					}
				>
					<Callout
						tone={status.overdue ? "danger" : "sky"}
						className="border-ink-200"
						title={backupWarning.title}
						titleClassName={status.overdue ? "text-stop-700" : undefined}
					>
						{backupWarning.body}
					</Callout>
					<Card accent="brand">
						<div className="p-4">
							<header className="mb-3">
								<CardTitle>Tujuan cadangan</CardTitle>
							</header>
							<div className="flex flex-col gap-3">
								{destination.map((item) => (
									<div
										key={item.label}
										className="flex items-center justify-between gap-3"
									>
										<LabelText>{item.label}</LabelText>
										<span className="text-right text-body-sm leading-[1.3] text-ink-900">
											{item.value}
										</span>
									</div>
								))}
							</div>
						</div>
					</Card>
					<Button
						disabled={busy}
						onClick={() => void backup.save()}
						block
						iconRight={<Download className="size-4" aria-hidden />}
					>
						{backup.downloaded ? "Berkas sudah tersimpan" : "Perbarui cadangan"}
					</Button>
					<Button
						disabled={busy}
						onClick={() => input.current?.click()}
						variant="secondary"
						block
					>
						Pulihkan cadangan
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
