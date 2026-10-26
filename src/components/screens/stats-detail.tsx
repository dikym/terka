"use client";

import { useState } from "react";
import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeLink } from "@/components/ui/code-chip";
import { Pill, ProgressBar } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import { type MapProvince, MasteryMap } from "@/components/ui/mastery-map";
import { PageTitle } from "@/components/ui/page-title";
import { EmptyState } from "@/components/ui/states";
import { showToast } from "@/lib/toasts";
import { referenceHref } from "@/lib/view/reference";
import type { HardCard, MasteryRow } from "@/lib/view/stats";
import { NOTE_MAX_CHARS } from "@/rules";
import { SignInForm, type SignIn } from "./sign-in";
import { MapHint, MapLegend } from "./stats";

export function MasteryMapScreen({
	provinces,
	rows
}: {
	provinces: Record<string, MapProvince>;
	rows: MasteryRow[] | null;
}) {
	return (
		<>
			<PageTitle title="Peta Penguasaan" back="/statistik" />
			{/* A card on desktop; on a phone the map runs edge to edge right under the top bar. */}
			<section className="flex flex-col gap-4 lg:overflow-hidden lg:rounded-md lg:border lg:border-hairline lg:bg-paper-0 lg:p-4 lg:shadow-lift">
				<div className="hidden lg:block">
					<CardHeader label="Peta Penguasaan" title="Penguasaan tiap provinsi" />
				</div>
				<div className="-mx-4 -mt-5 border-b border-hairline lg:m-0 lg:border-0">
					<MasteryMap provinces={provinces} loading={rows === null} />
				</div>
				<div className="flex flex-col gap-3 lg:border-t lg:border-hairline lg:pt-4">
					<MapLegend />
					<MapHint />
				</div>
			</section>
			<div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
				{(rows ?? []).map((row) => (
					<div
						key={row.group}
						className="grid grid-cols-[10px_minmax(0,1fr)_44px] items-start gap-3 border-b border-hairline py-4 lg:grid-cols-[10px_minmax(0,1fr)_160px_48px] lg:items-center lg:gap-x-4"
					>
						<span
							className={`mt-1 size-2.5 rounded-full lg:mt-0 ${GROUP_BG[row.group]}`}
						/>
						<div className="flex min-w-0 flex-col gap-2">
							<Link
								href={referenceHref("kawasan", row.group)}
								className="w-fit font-display text-body-md leading-[1.2] font-semibold underline-offset-[3px] hover:underline"
							>
								{row.name}
							</Link>
							<ProgressBar
								value={row.percent}
								color={GROUP_BG[row.group]}
								className="h-1.5 lg:hidden"
							/>
							<div className="flex flex-wrap gap-x-5 gap-y-2">
								{row.figures.map(([value, label]) => (
									<span key={label} className="inline-flex flex-col gap-0.75">
										<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
											{value}
										</span>
										<span className="font-sans text-micro leading-[1.2] text-ink-500">
											{label}
										</span>
									</span>
								))}
							</div>
							{row.note && (
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

const NOT_SAVED = "Perubahan belum tersimpan. Coba lagi.";

export function HardCodesScreen({
	cards,
	notes,
	initial,
	onSaveNote,
	onReactivate
}: {
	cards: HardCard[] | null;
	notes: ReadonlyMap<string, string>;
	/** The front code to open first, from a note offer in a session. */
	initial: string | null;
	onSaveNote: (card: HardCard, body: string) => Promise<boolean>;
	onReactivate: (card: HardCard) => Promise<boolean>;
}) {
	const hardCards = cards ?? [];
	const [chosen, setChosen] = useState<string | null>(null);
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const card =
		hardCards.find((item) => item.cardId === chosen) ??
		hardCards.find((item) => item.code === initial) ??
		hardCards[0];
	const selected = card?.cardId ?? null;
	if (!card)
		return (
			<>
				<PageTitle title="Sulit Dikuasai" back="/statistik" />
				{cards !== null && (
					<EmptyState label="Sulit Dikuasai">Belum ada kode Sulit Dikuasai.</EmptyState>
				)}
			</>
		);
	const note = drafts[card.cardId] ?? notes.get(card.contentId) ?? "";

	const section = (label: string, kind: "leech" | "suspended") => {
		const items = hardCards.filter((item) => item.status === kind);
		if (!items.length) return null;
		return (
			<div className="flex min-w-0 flex-col gap-3">
				<span className="type-label text-ink-500">
					{items.length} {label}
				</span>
				{items.map((item) => (
					<div
						key={item.cardId}
						className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-sm border px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:gap-4 ${item.cardId === selected ? "border-ink-1000 bg-paper-0 shadow-block" : "border-hairline"}`}
					>
						<CodeLink
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
							onClick={() => setChosen(item.cardId)}
							aria-pressed={item.cardId === selected}
							className="col-start-3 row-span-2 row-start-1 flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-sm border border-ink-200 bg-transparent px-3 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-900 lg:col-auto lg:row-auto lg:h-12 lg:px-5 lg:text-body-md"
						>
							Tinjau kode
						</button>
					</div>
				))}
			</div>
		);
	};

	const current = card.status;
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
								<CodeLink code={card.code} group={card.group} />
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
						{card.more > 0 && (
							<span className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
								+{card.more} lainnya
							</span>
						)}
						<label className="flex flex-col gap-2">
							<span className="type-label text-ink-500">Catatan pengingat</span>
							<textarea
								value={note}
								maxLength={NOTE_MAX_CHARS}
								onChange={(event) =>
									setDrafts((current) => ({
										...current,
										[card.cardId]: event.target.value
									}))
								}
								onBlur={() => {
									if (note === (notes.get(card.contentId) ?? "")) return;
									void onSaveNote(card, note).then((saved) =>
										showToast(
											saved
												? { tone: "success", text: "Catatan disimpan" }
												: { tone: "danger", text: NOT_SAVED }
										)
									);
								}}
								placeholder="Misalnya: DR — Dari Rinjani"
								className="min-h-22 resize-none rounded-sm border border-ink-1000 bg-paper-0 px-4 py-3 font-sans text-body-md leading-normal text-ink-1000 placeholder:text-ink-500"
							/>
							<span className="self-end font-mono text-body-sm leading-none font-medium text-ink-500">
								{note.length}/{NOTE_MAX_CHARS}
							</span>
						</label>
						{current === "suspended" && (
							<Button
								block
								onClick={() =>
									void onReactivate(card).then((done) =>
										showToast(
											done
												? {
														tone: "success",
														label: "Sulit Dikuasai",
														text: "Kode ini diaktifkan kembali dan dimulai dari awal."
													}
												: { tone: "danger", text: NOT_SAVED }
										)
									)
								}
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

export type AccountPage = {
	email: string;
	provider: string;
	pending: string;
	pendingNote: string | null;
	synced: string;
	devices: string;
};

export type AccountActions = {
	exportData: () => void;
	importData: () => void;
	signOut: () => void;
	deleteAccount: () => void;
};

export function AccountScreen({
	page,
	lastExport,
	signIn,
	actions
}: {
	/** Null while signed out. */
	page: AccountPage | null;
	lastExport: string | null;
	signIn: SignIn | null;
	actions: AccountActions;
}) {
	return (
		<>
			<PageTitle title="Akun dan sinkronisasi" back="/statistik" />
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					{page ? (
						<Card>
							<CardHeader label="Akun" />
							<div className="flex flex-col">
								<AccountRow icon="user">
									<div className="flex flex-col gap-0.75">
										<span className="font-display text-body-md leading-[1.2] font-semibold">
											{page.email}
										</span>
										<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
											{page.provider}
										</span>
									</div>
								</AccountRow>
								<AccountRow
									icon="cloud-upload"
									aside={page.pendingNote ?? undefined}
								>
									<span className="text-ink-900 type-body">{page.pending}</span>
								</AccountRow>
								<AccountRow icon="cloud-check" aside={page.devices} last>
									<span className="text-ink-900 type-body">{page.synced}</span>
								</AccountRow>
							</div>
						</Card>
					) : (
						signIn && <SignInForm signIn={signIn} />
					)}
					<Card>
						<CardHeader label="Ekspor dan impor" title={lastExport ?? "…"} />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							Ekspor menyimpan riwayat latihan, pengaturan, dan catatan pengingat
							dalam satu berkas JSON. Sinkronisasi menyimpan salinan di server; ekspor
							tetap berguna sebagai salinan yang kamu pegang sendiri.
						</p>
						<div className="flex items-center gap-3">
							<Button size="sm" icon="download" onClick={actions.exportData}>
								Ekspor data
							</Button>
							<Button
								variant="secondary"
								size="sm"
								icon="upload"
								onClick={actions.importData}
							>
								Impor data
							</Button>
						</div>
					</Card>
				</div>
				{page && (
					<aside className="flex min-w-0 flex-col gap-5">
						<Card>
							<CardHeader label="Keluar dan hapus akun" />
							<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
								Keluar menyelesaikan sinkronisasi lebih dulu, lalu menghapus data
								dari perangkat ini.
							</p>
							<Button
								variant="secondary"
								size="sm"
								block
								icon="log-out"
								onClick={actions.signOut}
							>
								Keluar
							</Button>
							<div className="h-px bg-hairline" />
							<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
								Menghapus akun menghapus data di server. Data di perangkat ini tetap
								ada.
							</p>
							<Button
								variant="quiet"
								size="sm"
								block
								className="text-ink-1000"
								onClick={actions.deleteAccount}
							>
								Hapus akun
							</Button>
						</Card>
					</aside>
				)}
			</div>
		</>
	);
}
