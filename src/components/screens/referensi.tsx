"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SEARCH_HASH, SEARCH_ID } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeChip } from "@/components/ui/code-chip";
import { Skeleton, SkeletonText, skeletonWidth } from "@/components/ui/feedback";
import {
	GROUP_BG,
	GROUP_BORDER,
	GROUP_IDS,
	GROUP_NAME,
	type GroupId
} from "@/components/ui/groups";
import { Flag, Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { SpecialPlate } from "@/components/ui/plate";
import { DotLabel, TagButton } from "@/components/ui/tag";
import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import { sightingCounts } from "@/core/views/stats";
import { SIGHTING_WINDOW_DAYS } from "@/rules";
import { uiGroup } from "@/lib/view/groups";
import {
	diplomatEntry,
	diplomatList,
	otherCodes,
	type RefGroup,
	type RegionDetail,
	refGroups,
	refView,
	regionDetail,
	suggestions,
	unverifiedCodes
} from "@/lib/view/reference";
import {
	DiplomatList,
	Divider,
	FormatCard,
	FormatCards,
	Hint,
	NoResult,
	REFERENCE_ONLY,
	RegionCard,
	SpecialCard,
	UnverifiedLegend
} from "./referensi-results";

const LISTBOX_ID = "referensi-saran";
const optionId = (position: number) => `referensi-saran-${position}`;

function SearchBox({
	value,
	onChange,
	onKeyDown,
	expanded,
	active
}: {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (event: React.KeyboardEvent) => void;
	expanded: boolean;
	active: number | null;
}) {
	const input = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (window.location.hash === `#${SEARCH_HASH}`) input.current?.focus();
	}, []);
	return (
		<div className="flex h-13 items-center gap-3 rounded-sm border border-ink-1000 bg-paper-0 px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-1000">
			<Icon name="search" />
			<input
				ref={input}
				id={SEARCH_ID}
				role="combobox"
				aria-expanded={expanded}
				aria-controls={LISTBOX_ID}
				aria-autocomplete="list"
				aria-activedescendant={expanded && active !== null ? optionId(active) : undefined}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={onKeyDown}
				placeholder="Cari kode atau wilayah…"
				aria-label="Cari kode atau wilayah"
				autoComplete="off"
				spellCheck={false}
				className="min-w-0 flex-1 bg-transparent font-mono text-body-lg leading-none font-medium text-ink-1000 outline-none placeholder:font-sans placeholder:font-normal placeholder:text-ink-500"
			/>
			{value ? (
				<Tooltip content="Hapus pencarian" kbd="Esc">
					<button
						type="button"
						aria-label="Hapus pencarian"
						onClick={() => onChange("")}
						className="flex cursor-pointer"
					>
						<Icon name="x" size={18} />
					</button>
				</Tooltip>
			) : (
				<Kbd>/</Kbd>
			)}
		</div>
	);
}

function Suggest({
	bundle,
	query,
	highlight,
	onPick
}: {
	bundle: Bundle;
	query: string;
	highlight: number;
	onPick: (value: string) => void;
}) {
	const result = suggestions(bundle, query);
	// A long list scrolls; the highlighted row stays in view while moving with the arrows.
	useEffect(() => {
		document.getElementById(optionId(highlight))?.scrollIntoView({ block: "nearest" });
	}, [highlight]);
	const prefix = query.trim().toUpperCase().replace(/\s+/g, " ");
	return (
		<div
			id={LISTBOX_ID}
			role="listbox"
			className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 max-h-80 overflow-y-auto rounded-sm border border-ink-1000 bg-paper-0 shadow-block"
		>
			{result.diplomats.length > 0 && (
				<>
					<div className="flex items-center justify-between px-4 pt-3 pb-2">
						<span className="type-label text-ink-500">Kode diplomat</span>
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
							{result.diplomatTotal} hasil
						</span>
					</div>
					{result.diplomats.map((entry, index) => {
						const code = `CD ${entry.number}`;
						return (
							<button
								key={entry.number}
								id={optionId(index)}
								type="button"
								role="option"
								aria-selected={index === highlight}
								onClick={() => onPick(code)}
								className={`grid min-h-12 w-full cursor-pointer grid-cols-[64px_20px_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left ${index === highlight ? "bg-paper-50" : ""}`}
							>
								<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
									<span className="bg-caution-100">
										{code.slice(0, prefix.length)}
									</span>
									{code.slice(prefix.length)}
								</span>
								{entry.flag && <Flag code={entry.flag} />}
								<span
									className={`text-ink-900 type-body ${entry.flag ? "" : "col-span-2"}`}
								>
									{entry.name}
								</span>
								{index === highlight && <Kbd>Enter</Kbd>}
								{/* A phone has no Enter hint, so the type stays on the highlighted row. */}
								<span
									className={`font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums ${index === highlight ? "lg:hidden" : ""}`}
								>
									{entry.type}
								</span>
							</button>
						);
					})}
					{result.regions.length > 0 && <div className="h-px bg-hairline" />}
				</>
			)}
			{result.regions.length > 0 && (
				<>
					<div className="flex items-center justify-between px-4 pt-3 pb-2">
						<span className="type-label text-ink-500">Kode wilayah</span>
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
							{result.regions.length} hasil
						</span>
					</div>
					{result.regions.map((region, index) => {
						const position = result.diplomats.length + index;
						return (
							<button
								key={region.code}
								id={optionId(position)}
								type="button"
								role="option"
								aria-selected={position === highlight}
								onClick={() => onPick(region.code)}
								className={`grid min-h-14 w-full cursor-pointer grid-cols-[52px_minmax(0,1fr)] items-center gap-3 px-4 py-2 text-left lg:min-h-12 lg:grid-cols-[64px_minmax(0,1fr)_auto] lg:py-0 ${position === highlight ? "bg-paper-50" : ""}`}
							>
								<CodeChip code={region.code} group={region.group} />
								<span className="flex flex-col gap-0.5 lg:contents">
									<span className="text-ink-900 type-body">{region.areas}</span>
									<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
										{region.province}
									</span>
								</span>
							</button>
						);
					})}
				</>
			)}
		</div>
	);
}

// A phone sets a province's chips four to a row, right-aligned.
const CHIP_COLUMNS = [
	"grid-cols-[repeat(1,auto)]",
	"grid-cols-[repeat(2,auto)]",
	"grid-cols-[repeat(3,auto)]",
	"grid-cols-[repeat(4,auto)]"
];

// Holds the list's shape while the data loads.
const SKELETON_GROUPS: RefGroup[] = (["sumatera", "jawa", "kalimantan"] as const).map((id) => ({
	id,
	codes: 0,
	provinces: ["Sumatera Utara", "Jawa Barat", "Bali"].map((name, index) => ({
		id: `${id}-${index}`,
		name,
		codes: ["a", "b"].slice(0, index + 1)
	}))
}));

function RegionList({ bundle }: { bundle: Bundle | null }) {
	const [filter, setFilter] = useState<GroupId | "all">("all");
	const loading = bundle === null;
	const all = useMemo(() => (bundle ? refGroups(bundle) : SKELETON_GROUPS), [bundle]);
	const unverified = useMemo(() => (bundle ? unverifiedCodes(bundle) : new Set()), [bundle]);
	const groups = loading ? all : all.filter((group) => filter === "all" || group.id === filter);
	return (
		<>
			<div className="flex flex-wrap gap-2">
				{loading ? (
					["112px", "86px", "56px", "96px", "84px", "176px", "70px", "62px"].map(
						(width) => (
							<Skeleton key={width} width={width} className="h-6.5 rounded-xs" />
						)
					)
				) : (
					<>
						<TagButton active={filter === "all"} onClick={() => setFilter("all")}>
							Semua kawasan
						</TagButton>
						{GROUP_IDS.map((id) => (
							<TagButton
								key={id}
								active={filter === id}
								onClick={() => setFilter(id)}
							>
								<span className={`size-2 rounded-full ${GROUP_BG[id]}`} />
								{GROUP_NAME[id]}
							</TagButton>
						))}
					</>
				)}
			</div>
			<UnverifiedLegend note="Tersedia di Referensi, belum masuk latihan." />
			{groups.map((group) => (
				<section key={group.id} className="flex flex-col gap-2">
					<header
						className={`flex items-end justify-between gap-3 border-b-2 pb-3 ${GROUP_BORDER[group.id]}`}
					>
						<h3 className="type-card-title">
							{loading ? (
								<SkeletonText width={skeletonWidth(GROUP_NAME[group.id])} />
							) : (
								GROUP_NAME[group.id]
							)}
						</h3>
						<div className="grid grid-cols-2 gap-4">
							{[
								[group.provinces.length, "provinsi"],
								[group.codes, "kode"]
							].map(([value, label]) => (
								<span key={label} className="flex min-w-0 flex-col gap-[3px]">
									<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
										{loading ? <SkeletonText width="1.2em" /> : value}
									</span>
									<span className="font-sans text-micro leading-[1.2] text-ink-500">
										{loading ? <SkeletonText width="3em" /> : label}
									</span>
								</span>
							))}
						</div>
					</header>
					<div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
						{group.provinces.map((province) => (
							<div
								key={province.id}
								className="flex min-h-12 items-center justify-between gap-3 border-b border-hairline py-1.5"
							>
								<span className="font-sans text-body-md leading-[1.2] text-ink-900">
									{loading ? (
										<SkeletonText width={skeletonWidth(province.name)} />
									) : (
										province.name
									)}
								</span>
								<span
									className={`grid justify-end gap-1 lg:flex lg:max-w-34.5 lg:flex-wrap lg:gap-1.5 ${CHIP_COLUMNS[Math.min(province.codes.length, 4) - 1]}`}
								>
									{province.codes.map((code) =>
										loading ? (
											<Skeleton
												key={code}
												className="h-5.5 w-7.5 rounded-sm"
											/>
										) : (
											<CodeChip
												key={code}
												code={code}
												group={group.id}
												size="xs"
												unverified={unverified.has(code)}
											/>
										)
									)}
								</span>
							</div>
						))}
					</div>
				</section>
			))}
		</>
	);
}

function SpecialCodesCard({ loading }: { loading: boolean }) {
	const rows: [[string, string, string], string, "go" | "muted", string][] = [
		[
			["CD", "12", "5"],
			"Korps diplomatik dan organisasi internasional",
			"go",
			"Latihan dan Referensi"
		],
		[["CC", "12", "10"], "Korps konsulat", "muted", "Referensi saja"],
		[["CH", "130", "1"], "Konsul kehormatan", "muted", "Referensi saja"],
		[["RI", "1", ""], "Pejabat negara", "muted", "Hanya format"]
	];
	return (
		<Card className="gap-2">
			<CardHeader label="Kode khusus" title="Pelat tanpa wilayah" />
			{rows.map(([parts, title, tone, label], index) => (
				<div
					key={title}
					className={`grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 py-3 lg:grid-cols-[96px_minmax(0,1fr)] ${index < rows.length - 1 ? "border-b border-hairline" : ""}`}
				>
					{loading ? (
						<Skeleton className="h-5.5 w-19 rounded-xs" />
					) : (
						<SpecialPlate parts={parts} />
					)}
					<div className="flex min-w-0 flex-col gap-1">
						<span className="font-sans text-body-sm leading-[1.3] font-medium text-ink-900">
							{title}
						</span>
						{loading ? (
							<span className="flex items-center gap-1.5">
								<Skeleton className="size-[7px] rounded-full" />
								<SkeletonText width={skeletonWidth(label)} />
							</span>
						) : (
							<DotLabel
								tone={tone}
								hint={label === "Referensi saja" ? REFERENCE_ONLY : undefined}
							>
								{label}
							</DotLabel>
						)}
					</div>
				</div>
			))}
		</Card>
	);
}

type SeenRow = { code: string; group: GroupId; count: number };

function SeenCard({ rows: all }: { rows: SeenRow[] | null }) {
	const loading = all === null;
	const rows = (all ?? SKELETON_SEEN).slice(0, 3);
	return (
		<Card className="gap-2">
			<CardHeader
				label="Pelat Terlihat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{loading ? (
							<SkeletonText width="9em" />
						) : (
							`${SIGHTING_WINDOW_DAYS} hari terakhir`
						)}
					</span>
				}
			/>
			<div className="flex flex-col">
				{rows.map((row, index) => (
					<div
						key={row.code}
						className={`flex items-center justify-between gap-4 py-3 ${index < rows.length - 1 ? "border-b border-hairline" : ""}`}
					>
						{loading ? (
							<Skeleton className="h-7 w-10 rounded-sm" />
						) : (
							<CodeChip code={row.code} group={row.group} />
						)}
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
							{loading ? <SkeletonText width="2.5em" /> : `${row.count} kali`}
						</span>
					</div>
				))}
			</div>
			<Hint>Hanya kode depan yang disimpan. Nomor dan huruf belakang dibuang.</Hint>
		</Card>
	);
}

function DisclaimerCard() {
	return (
		<div className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3 rounded-md border border-hairline bg-paper-0 px-4 py-3">
			<Icon name="info" size={18} color="bg-ink-700" />
			<p className="font-sans text-body-sm leading-normal text-pretty text-ink-900">
				Terka membantu belajar kode pelat, bukan rujukan resmi. Data yang belum cukup
				terverifikasi diberi penanda.
			</p>
		</div>
	);
}

function SearchHelp() {
	return (
		<Card className="gap-2">
			<CardHeader label="Pencarian" />
			<Hint>
				Ketik kode depan, kode diplomat, atau nama wilayah. Hasil muncul langsung di bawah
				kolom pencarian.
			</Hint>
		</Card>
	);
}

function RegionAside({ detail, note }: { detail: RegionDetail; note: string | null }) {
	const rows: [string, React.ReactNode][] = [
		[
			"Label data",
			detail.verified ? (
				<span
					key="v"
					className="inline-flex items-center gap-2 type-label whitespace-nowrap text-go-700"
				>
					<Icon name="shield-check" size={16} color="bg-current" />
					Terverifikasi
				</span>
			) : (
				<span key="u" className="type-label whitespace-nowrap text-caution-700">
					Belum terverifikasi penuh
				</span>
			)
		],
		["Pelat Terlihat", detail.seen ?? "belum ada"],
		["Catatan pengingat", note ?? "belum ada"]
	];
	return (
		<>
			<Card className="gap-1">
				<CardHeader label={`Rincian ${detail.code}`} />
				<div className="flex flex-col">
					{rows.map(([label, value], index) => (
						<div
							key={label}
							className={`flex items-center justify-between gap-4 py-3 ${index < rows.length - 1 ? "border-b border-hairline" : ""}`}
						>
							<span className="type-label text-ink-500">{label}</span>
							<span className="flex min-w-0 items-center gap-2 text-right font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
								<span className={value === "belum ada" ? "text-ink-500" : ""}>
									{value}
								</span>
							</span>
						</div>
					))}
				</div>
			</Card>
			<Hint>
				Referensi hanya menampilkan data. Tidak ada soal, penilaian, atau perubahan jadwal
				di sini.
			</Hint>
		</>
	);
}

const SEARCH_DEBOUNCE_MS = 250;

export type ReferenceData = {
	bundle: Bundle;
	state: AppState;
	today: string;
	notes: ReadonlyMap<string, string>;
};

const SKELETON_SEEN: SeenRow[] = ["a", "b", "c"].map((code) => ({
	code,
	group: "jawa",
	count: 1
}));

export function Referensi({
	data,
	onQuery
}: {
	data: ReferenceData | null;
	/** Called with every settled query; the page decides what counts as a sighting. */
	onQuery: (query: string) => void;
}) {
	// `query` is the text in the box; `searched` follows it once typing pauses.
	const [query, setQuery] = useState("");
	const [searched, setSearched] = useState("");
	const [highlight, setHighlight] = useState(0);
	const bundle = data?.bundle ?? null;
	const view = useMemo(
		() => (bundle ? refView(bundle, searched) : { kind: "list" as const }),
		[bundle, searched]
	);
	const seen = useMemo(() => {
		if (!data) return null;
		const regions = new Map(data.bundle.regions.map((region) => [region.id, region]));
		return [...sightingCounts(data.state, data.today)]
			.flatMap(([id, count]) => {
				const region = regions.get(id);
				return region ? [{ code: region.code, group: uiGroup(region.group), count }] : [];
			})
			.sort((a, b) => b.count - a.count);
	}, [data]);

	// A search counts as a sighting once the query rests for a moment, not on every keystroke.
	const latestQuery = useRef(onQuery);
	useEffect(() => {
		latestQuery.current = onQuery;
	});
	useEffect(() => {
		if (!searched.trim()) return;
		const timer = setTimeout(() => latestQuery.current(searched), 1500);
		return () => clearTimeout(timer);
	}, [searched]);

	useEffect(() => {
		if (query === searched) return;
		const timer = setTimeout(() => {
			setSearched(query);
			setHighlight(0);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [query, searched]);

	const type = (value: string) => setQuery(value);
	// Clearing, Escape and picking a suggestion are deliberate: they apply at once.
	const update = (value: string) => {
		setQuery(value);
		setSearched(value);
		setHighlight(0);
	};
	const options = view.kind === "suggest" && bundle ? suggestions(bundle, searched) : null;
	const optionCodes = options
		? [
				...options.diplomats.map((entry) => `CD ${entry.number}`),
				...options.regions.map((region) => region.code)
			]
		: [];

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Escape") return update("");
		if (!optionCodes.length) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setHighlight((index) => Math.min(optionCodes.length - 1, index + 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setHighlight((index) => Math.max(0, index - 1));
		} else if (event.key === "Enter") update(optionCodes[highlight]);
	};

	let main: React.ReactNode;
	let aside: React.ReactNode;
	if (view.kind === "region" && data) {
		const detail = regionDetail(data.bundle, data.state, view.code, data.today);
		const others = otherCodes(data.bundle, view.code);
		const regionId = data.bundle.regions.find((region) => region.code === view.code)?.id;
		main = (
			<>
				<Hint>1 kode ditemukan, diurutkan dari kota lalu kabupaten.</Hint>
				<RegionCard detail={detail} loading={false} />
				{others.length > 0 && (
					<>
						<Divider label={`Kode lain di ${detail.province}`} />
						{others.map((code) => (
							<RegionCard
								key={code}
								detail={regionDetail(data.bundle, data.state, code, data.today)}
								loading={false}
							/>
						))}
					</>
				)}
			</>
		);
		aside = (
			<RegionAside detail={detail} note={(regionId && data.notes.get(regionId)) || null} />
		);
	} else if (view.kind === "special" && data) {
		const special = data.bundle.specials.find((entry) => entry.number === view.number)!;
		const registration =
			searched.trim().toUpperCase().replace(/\s+/g, " ") !== `CD ${view.number}`;
		main = (
			<>
				{registration && (
					<Hint>
						Dibaca sebagai kode diplomat CD {view.number}. Nomor urut registrasi tidak
						dipakai, jadi tidak ditampilkan.
					</Hint>
				)}
				<SpecialCard entry={diplomatEntry(data.bundle, special)} />
				<Divider label="Format pelat khusus" />
				<FormatCards />
			</>
		);
		aside = (
			<>
				<DiplomatList
					list={diplomatList(data.bundle)}
					current={view.number}
					onPick={update}
				/>
				<Hint>Pencarian kode khusus tidak dicatat di Pelat Terlihat.</Hint>
			</>
		);
	} else if (view.kind === "cc" || view.kind === "ri") {
		main = <FormatCard kind={view.kind} />;
		aside = (
			<>
				<SearchHelp />
				<Hint>Pencarian kode khusus tidak dicatat di Pelat Terlihat.</Hint>
			</>
		);
	} else if (view.kind === "none") {
		main = <NoResult query={searched.trim()} />;
		aside = <SearchHelp />;
	} else {
		main = <RegionList bundle={bundle} />;
		aside =
			view.kind === "suggest" ? (
				<SearchHelp />
			) : (
				<>
					<SpecialCodesCard loading={!data} />
					{(seen === null || seen.length > 0) && <SeenCard rows={seen} />}
					<DisclaimerCard />
				</>
			);
	}

	return (
		<>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<h1 className="type-screen-title">Referensi</h1>
				</div>
			</div>
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="relative">
						<SearchBox
							value={query}
							onChange={(value) => (value ? type(value) : update(value))}
							onKeyDown={onKeyDown}
							expanded={view.kind === "suggest"}
							active={optionCodes.length ? highlight : null}
						/>
						{view.kind === "suggest" && bundle && (
							<Suggest
								bundle={bundle}
								query={searched}
								highlight={highlight}
								onPick={update}
							/>
						)}
					</div>
					{main}
				</div>
				<aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8">{aside}</aside>
			</div>
		</>
	);
}
