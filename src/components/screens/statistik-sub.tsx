"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeChip } from "@/components/ui/code-chip";
import { Pill, ProgressBar } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { MasteryMap } from "@/components/ui/mastery-map";
import { PageTitle } from "@/components/ui/page-title";
import { Toast, Toasts } from "@/components/ui/toast";
import { provinces } from "@/dummy/map";
import { accountPage, hardCards, masteryByGroup } from "@/dummy/stats";
import { MapHint, MapLegend } from "./statistik";

export function PetaPenguasaan() {
	return (
		<>
			<PageTitle title="Peta Penguasaan" back="/statistik" />
			{/* A card on desktop; on a phone the map runs edge to edge right under the top bar. */}
			<section className="flex flex-col gap-4 lg:overflow-hidden lg:rounded-md lg:border lg:border-hairline lg:bg-paper-0 lg:p-4 lg:shadow-lift">
				<div className="hidden lg:block">
					<CardHeader label="Peta Penguasaan" title="Penguasaan tiap provinsi" />
				</div>
				<div className="-mx-4 -mt-5 border-b border-hairline lg:m-0 lg:border-0">
					<MasteryMap provinces={provinces} />
				</div>
				<div className="flex flex-col gap-3 lg:border-t lg:border-hairline lg:pt-4">
					<MapLegend />
					<MapHint />
				</div>
			</section>
			<div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
				{masteryByGroup.map((row) => (
					<div
						key={row.group}
						className="grid grid-cols-[10px_minmax(0,1fr)_44px] items-start gap-3 border-b border-hairline py-4 lg:grid-cols-[10px_minmax(0,1fr)_160px_48px] lg:items-center lg:gap-x-4"
					>
						<span
							className={`mt-1 size-2.5 rounded-full lg:mt-0 ${GROUP_BG[row.group]}`}
						/>
						<div className="flex min-w-0 flex-col gap-2">
							<span className="font-display text-body-md leading-[1.2] font-semibold">
								{row.name}
							</span>
							<ProgressBar
								value={row.percent}
								color={GROUP_BG[row.group]}
								className="h-1.5 lg:hidden"
							/>
							<div className="flex flex-wrap gap-x-5 gap-y-2">
								{row.figures.map(([value, label]) => (
									<span key={label} className="inline-flex flex-col gap-[3px]">
										<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
											{value}
										</span>
										<span className="font-sans text-micro leading-[1.2] text-ink-500">
											{label}
										</span>
									</span>
								))}
							</div>
							{"note" in row && row.note && (
								<span
									className={`font-sans text-micro leading-[1.3] font-medium ${row.note.tone}`}
								>
									{row.note.text}
								</span>
							)}
						</div>
						<ProgressBar
							value={row.percent}
							color={GROUP_BG[row.group]}
							className="hidden h-2 flex-none lg:block"
						/>
						<span className="text-right">
							<span className="font-mono text-body-md leading-[1.2] font-medium text-ink-1000 tabular-nums">
								{row.percent}%
							</span>
						</span>
					</div>
				))}
			</div>
		</>
	);
}

const statusPill = (status: "leech" | "suspended", className = "") =>
	status === "leech" ? (
		<Pill tone="leech" className={className}>
			Sulit Dikuasai
		</Pill>
	) : (
		<Pill tone="suspended" className={className}>
			Dinonaktifkan
		</Pill>
	);

const NOTE_LIMIT = 280;

export function KodeSulit() {
	const [selected, setSelected] = useState("DN");
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [active, setActive] = useState<Set<string>>(new Set());
	const card = hardCards.find((item) => item.code === selected)!;
	const status = (code: string, base: "leech" | "suspended") =>
		active.has(code) ? "leech" : base;
	const note = notes[card.code] ?? "";

	const section = (label: string, kind: "leech" | "suspended") => {
		const items = hardCards.filter((item) => status(item.code, item.status) === kind);
		if (!items.length) return null;
		return (
			<div className="flex min-w-0 flex-col gap-3">
				<span className="type-label text-ink-500">
					{items.length} {label}
				</span>
				{items.map((item) => (
					<div
						key={item.code}
						className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-sm border px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:gap-4 ${item.code === selected ? "border-ink-1000 bg-paper-0 shadow-block" : "border-hairline"}`}
					>
						<CodeChip
							code={item.code}
							group={item.group}
							className="row-span-2 lg:row-auto"
						/>
						<div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1 lg:col-auto lg:row-auto">
							<span className="font-display text-body-md leading-[1.2] font-semibold">
								{item.form}
							</span>
							<span className="font-sans text-body-sm leading-[1.3] text-ink-500">
								{item.place},{" "}
								<span className="font-mono">{item.misses} kali terlewat</span>
							</span>
						</div>
						{statusPill(
							kind,
							"col-start-2 row-start-2 self-center justify-self-start lg:col-auto lg:row-auto"
						)}
						<button
							type="button"
							onClick={() => setSelected(item.code)}
							aria-pressed={item.code === selected}
							className="col-start-3 row-span-2 row-start-1 flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-sm border border-ink-200 bg-transparent px-3 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-900 lg:col-auto lg:row-auto lg:h-12 lg:px-5 lg:text-body-md"
						>
							Tinjau kode
						</button>
					</div>
				))}
			</div>
		);
	};

	const current = status(card.code, card.status);
	return (
		<>
			<PageTitle title="Sulit Dikuasai" back="/statistik" />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-9 lg:gap-5">
					{section("Sulit Dikuasai", "leech")}
					{section("Dinonaktifkan", "suspended")}
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					<Card>
						<div className="flex min-w-0 flex-col gap-3">
							<div className="flex items-center gap-3">
								<CodeChip code={card.code} group={card.group} />
								<span className="type-card-title">{card.form}</span>
							</div>
							{statusPill(current)}
						</div>
						<span className="type-label text-ink-500">Daerah kode {card.code}</span>
						<div className="flex flex-wrap gap-2">
							{card.areas.map((area) => (
								<span
									key={area}
									className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-3 font-sans text-body-md leading-none font-medium text-ink-1000"
								>
									{area}
								</span>
							))}
						</div>
						<span className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							+{card.more} lainnya
						</span>
						<label className="flex flex-col gap-2">
							<span className="type-label text-ink-500">Catatan pengingat</span>
							<textarea
								value={note}
								maxLength={NOTE_LIMIT}
								onChange={(event) =>
									setNotes((current) => ({
										...current,
										[card.code]: event.target.value
									}))
								}
								placeholder="Misalnya: DR — Dari Rinjani"
								className="min-h-22 resize-none rounded-sm border border-ink-1000 bg-paper-0 px-4 py-3 font-sans text-body-md leading-normal text-ink-1000 placeholder:text-ink-500"
							/>
							<span className="self-end font-mono text-body-sm leading-none font-medium text-ink-500">
								{note.length}/{NOTE_LIMIT}
							</span>
						</label>
						{current === "suspended" && (
							<Button
								block
								onClick={() => setActive((codes) => new Set(codes).add(card.code))}
							>
								Aktifkan kembali
							</Button>
						)}
					</Card>
				</aside>
			</div>
		</>
	);
}

function AccountRow({
	icon,
	last,
	children,
	aside
}: {
	icon: "user" | "cloud-upload" | "cloud-check";
	last?: boolean;
	children: React.ReactNode;
	aside?: string;
}) {
	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 lg:flex-nowrap ${last ? "" : "border-b border-hairline"}`}
		>
			<div className="flex min-w-0 items-center gap-3">
				<Icon name={icon} size={18} />
				{children}
			</div>
			{aside && (
				// When it wraps on a phone, it lines up with the text after the icon.
				<span className="ml-7.5 flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums lg:ml-0">
					{aside}
				</span>
			)}
		</div>
	);
}

export function Akun() {
	const [backup, setBackup] = useState(true);
	const [imported, setImported] = useState(false);
	const a = accountPage;
	return (
		<>
			<PageTitle title="Akun dan sinkronisasi" back="/statistik" />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader label="Akun" />
						<div className="flex flex-col">
							<AccountRow icon="user">
								<div className="flex flex-col gap-[3px]">
									<span className="font-display text-body-md leading-[1.2] font-semibold">
										{a.email}
									</span>
									<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
										{a.provider}
									</span>
								</div>
							</AccountRow>
							<AccountRow icon="cloud-upload" aside={a.pendingNote}>
								<span className="text-ink-900 type-body">{a.pending}</span>
							</AccountRow>
							<AccountRow icon="cloud-check" aside={a.devices} last>
								<span className="text-ink-900 type-body">{a.synced}</span>
							</AccountRow>
						</div>
					</Card>
					<Card>
						<CardHeader label="Ekspor dan impor" title={a.lastExport} />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							Ekspor menyimpan riwayat latihan, pengaturan, dan catatan pengingat
							dalam satu berkas JSON. Sinkronisasi menyimpan salinan di server; ekspor
							tetap berguna sebagai salinan yang kamu pegang sendiri.
						</p>
						<div className="flex items-center gap-3">
							<Button size="sm" icon="download">
								Ekspor data
							</Button>
							<Button
								variant="secondary"
								size="sm"
								icon="upload"
								onClick={() => setImported(true)}
							>
								Impor data
							</Button>
						</div>
					</Card>
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader label="Keluar dan hapus akun" />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							Keluar menyelesaikan sinkronisasi lebih dulu, lalu menghapus data dari
							perangkat ini.
						</p>
						<Button variant="secondary" size="sm" block icon="log-out">
							Keluar
						</Button>
						<div className="h-px bg-hairline" />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							Menghapus akun menghapus data di server. Data di perangkat ini tetap
							ada.
						</p>
						<Button variant="quiet" size="sm" block className="text-ink-1000">
							Hapus akun
						</Button>
					</Card>
				</aside>
			</div>
			{(backup || imported) && (
				<Toasts>
					{backup && (
						<Toast
							tone="warn"
							icon="hard-drive"
							label="Perbarui cadangan"
							onClose={() => setBackup(false)}
							action={
								<button
									type="button"
									className="inline-flex h-9 flex-none cursor-pointer items-center justify-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-3 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-1000"
								>
									<Icon name="download" size={16} />
									Ekspor data
								</button>
							}
						>
							Ekspor terakhir sudah lebih dari 30 hari.
						</Toast>
					)}
					{imported && (
						<Toast
							tone="success"
							icon="upload"
							label="Impor berhasil"
							onClose={() => setImported(false)}
						>
							{a.imported}
						</Toast>
					)}
				</Toasts>
			)}
		</>
	);
}
