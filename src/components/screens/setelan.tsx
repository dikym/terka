"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLearning } from "@/components/learning/learning-provider";
import { useBackupActions } from "@/components/learning/backup-actions";
import { dateLabel } from "@/lib/terka/practice";
import { createProgress } from "@/lib/terka/content";
import { Download, Shuffle, Undo2 } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LabelText } from "@/components/ui/label-text";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function SettingsSection({
	title,
	description,
	children
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<LabelText>{title}</LabelText>
				{description ? (
					<p className="max-w-105 text-body-sm text-ink-500">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

function SettingRow({
	label,
	value,
	tone = "ink"
}: {
	label: string;
	value: string;
	tone?: "ink" | "muted" | "warn" | "leech" | "danger";
}) {
	const valueColorClassName = {
		ink: "text-ink-1000",
		muted: "text-ink-500",
		warn: "text-caution-700",
		leech: "text-state-leech",
		danger: "text-stop-700"
	}[tone];
	return (
		<div className="flex items-center justify-between gap-3 border-b border-ink-200 py-3">
			<span className="text-body-md text-ink-900">{label}</span>
			<span
				className={cn(
					"font-mono text-body-md font-medium whitespace-nowrap",
					valueColorClassName
				)}
			>
				{value}
			</span>
		</div>
	);
}

function ToggleSetting({
	label,
	note,
	checked,
	onClick,
	disabled = true
}: {
	label: string;
	note?: string;
	checked: boolean;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<div className="flex items-start gap-3">
			<Switch checked={checked} label={label} disabled={disabled} onClick={onClick} />
			<div className="flex flex-col gap-0.5">
				<span className="font-display text-body-md font-semibold text-ink-1000">
					{label}
				</span>
				{note ? <span className="text-body-sm text-ink-500">{note}</span> : null}
			</div>
		</div>
	);
}

export function Setelan() {
	const { progress, content, busy, act, run } = useLearning();
	const router = useRouter();
	const actions = useBackupActions();
	const [resetOpen, setResetOpen] = useState(false);
	const backup = {
		status:
			progress.lastBackupAt === null
				? "Belum pernah dicadangkan"
				: `Terakhir: ${dateLabel(progress.lastBackupAt)}`,
		path: actions.folder ?? "Unduhan manual",
		note: actions.folder
			? "Cadangan otomatis mingguan saat aplikasi dibuka atau sesi selesai."
			: "Hubungkan folder untuk cadangan otomatis, atau unduh cadangan manual."
	};
	async function persist() {
		await run(async () => {
			if (!navigator.storage?.persist)
				throw new Error(
					"Penyimpanan permanen tidak tersedia di peramban ini. Tetap cadangkan data belajar secara berkala."
				);
			const granted = await navigator.storage.persist();
			if (!granted)
				throw new Error(
					"Peramban belum mengizinkan penyimpanan permanen. Chrome dapat menolak permintaan tanpa menampilkan dialog izin. Data belajar tetap tersimpan, tetapi tetap perlu dicadangkan secara berkala."
				);
			return granted;
		}, "warn").then((granted) => {
			if (granted !== undefined)
				void act((current) => ({ ...current, storagePersistent: granted }));
		});
	}
	async function reset() {
		setResetOpen(false);
		await act((current, data) => ({
			...createProgress(data, Date.now(), current.clock.timezone),
			storagePersistent: current.storagePersistent
		}));
	}

	return (
		<PageFrame>
			<PageTitle back="/">Setelan</PageTitle>
			<TwoColumn
				className="lg:grid-cols-2"
				aside={
					<>
						<SettingsSection title="Menjawab">
							<ToggleSetting
								checked
								label="Batas waktu Tanpa Petunjuk"
								note="8 detik. Lewat batas, soal ditutup dengan Waktu habis."
							/>
							<div className="flex flex-col">
								<SettingRow label="Pembatalan jawaban" value="tombol Z" />
								<SettingRow
									label="Penanda Sulit Dikuasai"
									value="6 kali terlewat"
									tone="leech"
								/>
								<SettingRow
									label="Nonaktif otomatis"
									value="8 kali terlewat"
									tone="danger"
								/>
							</div>
						</SettingsSection>
						<SettingsSection title="Data plat">
							<div className="flex flex-col">
								<SettingRow label="Versi dataset" value={content.version} />
								<SettingRow
									label="Masuk latihan"
									value={`${progress.cards.length} kartu`}
								/>
								<SettingRow
									label="Belum terverifikasi penuh"
									value="hanya di referensi"
									tone="muted"
								/>
							</div>
							<Button
								variant="quiet"
								size="sm"
								block
								disabled={busy}
								onClick={() => window.location.reload()}
								iconLeft={<Shuffle className="size-4" aria-hidden />}
							>
								Periksa pembaruan data
							</Button>
						</SettingsSection>
						<Callout tone="danger" title="Reset" titleClassName="text-stop-700">
							Menghapus seluruh progres tidak bisa dibatalkan. Cadangkan lebih dulu.
						</Callout>
						<Button
							disabled={busy}
							onClick={() => setResetOpen(true)}
							variant="stop"
							size="sm"
							block
						>
							Hapus seluruh progres
						</Button>
						<ConfirmDialog
							open={resetOpen}
							onOpenChange={setResetOpen}
							tone="danger"
							title="Hapus progres"
							description="Hapus seluruh progres belajar di perangkat ini? Pastikan cadangan sudah tersimpan. Tindakan ini tidak bisa dibatalkan."
							cancelLabel="Batal"
							confirmLabel="Hapus"
							busy={busy}
							onConfirm={() => void reset()}
						/>
					</>
				}
			>
				<SettingsSection
					title="Beban harian"
					description="Batas materi baru bersifat global dan terikat tanggal, bukan per Cakupan. Sepuluh adalah batas keras."
				>
					<label className="flex flex-col gap-2">
						<LabelText>Materi baru per hari</LabelText>
						<Select
							defaultValue="10"
							disabled
							title="Batas saat ini ditetapkan oleh aturan belajar."
						>
							<option value="10">10 materi (maksimal)</option>
							<option value="5">5 materi</option>
							<option value="0">0 materi</option>
						</Select>
					</label>
					<div className="flex flex-col">
						<SettingRow label="Batas pengulangan harian" value="40 kartu" />
						<SettingRow
							label="Penahanan materi baru"
							value="aktif di ≥ 40"
							tone="warn"
						/>
					</div>
				</SettingsSection>
				<SettingsSection
					title="Cadangan"
					description="Tanpa akun dan tanpa server, cadangan adalah fitur wajib. Data belajar yang terhapus berarti seluruh progres hilang."
				>
					<Card accent="success">
						<div className="flex flex-col gap-2 p-4">
							<Badge
								tone="success"
								dot
								className="self-start bg-transparent px-0 text-go-700"
							>
								{backup.status}
							</Badge>
							<span className="font-mono text-body-md font-medium text-ink-1000">
								{backup.path}
							</span>
							<span className="text-body-sm text-ink-500">{backup.note}</span>
						</div>
					</Card>
					<ToggleSetting
						checked={Boolean(actions.folder)}
						disabled={busy || !actions.supported}
						onClick={() => void actions.toggleFolder()}
						label="Cadangkan otomatis setiap minggu"
						note={
							!actions.supported
								? "Peramban ini mendukung unduhan manual."
								: undefined
						}
					/>
					<ToggleSetting
						checked={progress.storagePersistent === true}
						disabled={busy || progress.storagePersistent === true}
						onClick={() => void persist()}
						label="Penyimpanan permanen peramban"
						note="Mencegah data belajar dibersihkan otomatis oleh peramban."
					/>
					<div className="grid grid-cols-2 gap-3">
						<Button
							variant="secondary"
							size="sm"
							block
							disabled={busy}
							onClick={() => router.push("/cadangan")}
							iconLeft={<Download className="size-4" aria-hidden />}
						>
							Perbarui cadangan
						</Button>
						<Button
							variant="quiet"
							size="sm"
							block
							disabled={busy}
							onClick={() => router.push("/cadangan")}
							iconLeft={<Undo2 className="size-4" aria-hidden />}
						>
							Pulihkan
						</Button>
					</div>
				</SettingsSection>
				<SettingsSection title="Kartu dinonaktifkan">
					<div className="flex flex-col">
						<SettingRow
							label="Daftar tinjauan"
							value={`${progress.cards.filter((card) => card.state === "suspended").length} kartu`}
							tone="danger"
						/>
					</div>
					<Button
						onClick={() => router.push("/kartu-sulit")}
						variant="quiet"
						size="sm"
						block
					>
						Tinjau dan aktifkan manual
					</Button>
				</SettingsSection>
			</TwoColumn>
		</PageFrame>
	);
}
