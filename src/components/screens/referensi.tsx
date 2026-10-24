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
import { SpecialPlate } from "@/components/ui/plate";
import { DotLabel, TagButton } from "@/components/ui/tag";
import {
	otherCodes,
	REF_GROUPS,
	regionDetail,
	searchDummy,
	suggestions,
	UNVERIFIED
} from "@/dummy/reference";
import { stats } from "@/dummy/stats";
import {
	DiplomatList,
	Divider,
	FormatCard,
	FormatCards,
	Hint,
	NoResult,
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
				<button
					type="button"
					aria-label="Hapus pencarian"
					onClick={() => onChange("")}
					className="cursor-pointer"
				>
					<Icon name="x" size={18} />
				</button>
			) : (
				<Kbd>/</Kbd>
			)}
		</div>
	);
}

function Suggest({
	query,
	highlight,
	onPick
}: {
	query: string;
	highlight: number;
	onPick: (value: string) => void;
}) {
	const result = suggestions(query);
	const prefix = query.trim().toUpperCase().replace(/\s+/g, " ");
	const hidden = result.diplomatTotal - result.diplomats.length;
	return (
		<div
			id={LISTBOX_ID}
			role="listbox"
			className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-sm border border-ink-1000 bg-paper-0 shadow-block"
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
								<Flag code={entry.flag} />
								<span className="text-ink-900 type-body">{entry.name}</span>
								{index === highlight ? (
									<Kbd>Enter</Kbd>
								) : (
									<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
										{entry.type}
									</span>
								)}
							</button>
						);
					})}
					{hidden > 0 && (
						<button
							type="button"
							onClick={() => onPick(`CD ${result.diplomats[0].number}`)}
							className="flex min-h-10 w-full cursor-pointer items-center px-4 text-left font-display text-body-sm leading-none font-semibold text-ink-1000 underline underline-offset-[3px]"
						>
							Lihat {hidden} hasil lainnya
						</button>
					)}
					<div className="h-px bg-hairline" />
				</>
			)}
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
						className={`grid min-h-12 w-full cursor-pointer grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left ${position === highlight ? "bg-paper-50" : ""}`}
					>
						<CodeChip code={region.code} group={region.group} />
						<span className="text-ink-900 type-body">{region.areas}</span>
						<span className="font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
							{region.province}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function RegionList({ loading }: { loading: boolean }) {
	const [filter, setFilter] = useState<GroupId | "all">("all");
	const groups = loading
		? REF_GROUPS.slice(0, 3).map((group) => ({
				...group,
				provinces: group.provinces.slice(0, 3)
			}))
		: REF_GROUPS.filter((group) => filter === "all" || group.id === filter);
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
								[
									REF_GROUPS.find((item) => item.id === group.id)!.provinces
										.length,
									"provinsi"
								],
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
					<div className="grid grid-cols-2 gap-x-6">
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
								<span className="flex max-w-34.5 flex-wrap justify-end gap-1.5">
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
												unverified={UNVERIFIED.has(code)}
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
					className={`grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 py-3 ${index < rows.length - 1 ? "border-b border-hairline" : ""}`}
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
							<DotLabel tone={tone}>{label}</DotLabel>
						)}
					</div>
				</div>
			))}
		</Card>
	);
}

function SeenCard({ loading }: { loading: boolean }) {
	const rows = stats.seen.slice(0, 3);
	return (
		<Card className="gap-2">
			<CardHeader
				label="Pelat Terlihat"
				aside={
					<span className="flex-none font-mono text-body-sm leading-[1.2] font-medium text-ink-500 tabular-nums">
						{loading ? <SkeletonText width="9em" /> : "30 hari terakhir"}
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

function RegionAside({ code, loading }: { code: string; loading: boolean }) {
	const detail = regionDetail(code);
	const rows: [string, React.ReactNode, string][] = [
		[
			"Label data",
			<span
				key="v"
				className="inline-flex items-center gap-2 type-label whitespace-nowrap text-go-700"
			>
				<Icon name="shield-check" size={16} color="bg-current" />
				Terverifikasi
			</span>,
			"6em"
		],
		["Pelat Terlihat", detail.seen ?? "belum ada", "9em"],
		["Catatan pengingat", "belum ada", "4em"]
	];
	const nearby = detail.nearby;
	return (
		<>
			<Card className="gap-1">
				<CardHeader label={loading ? <SkeletonText width="4.4em" /> : `Rincian ${code}`} />
				<div className="flex flex-col">
					{rows.map(([label, value, width], index) => (
						<div
							key={label}
							className={`flex items-center justify-between gap-4 py-3 ${index < rows.length - 1 ? "border-b border-hairline" : ""}`}
						>
							<span className="type-label text-ink-500">{label}</span>
							<span className="flex flex-none items-center gap-2 font-mono text-body-sm leading-[1.2] font-medium text-ink-1000 tabular-nums">
								{loading ? (
									<>
										{index === 0 && <Skeleton className="size-4 rounded-xs" />}
										<SkeletonText width={width} />
									</>
								) : (
									<span className={value === "belum ada" ? "text-ink-500" : ""}>
										{value}
									</span>
								)}
							</span>
						</div>
					))}
				</div>
			</Card>
			{(nearby || loading) && (
				<Card className="gap-3">
					<CardHeader label="Di sekitarnya" />
					<div className="flex flex-wrap gap-2">
						{(nearby?.codes ?? ["a", "b", "c"]).map((item) =>
							loading ? (
								<Skeleton key={item} className="h-7 w-10 rounded-sm" />
							) : (
								<CodeChip key={item} code={item} group={detail.group} />
							)
						)}
					</div>
					<Hint>{loading ? <SkeletonText width="26em" /> : nearby?.note}</Hint>
				</Card>
			)}
			<Hint>
				Referensi hanya menampilkan data. Tidak ada soal, penilaian, atau perubahan jadwal
				di sini.
			</Hint>
		</>
	);
}

/** Opening a code shows the detail skeleton for a moment, as loading real data will. */
function useDetailLoading(code: string | null) {
	const [shown, setShown] = useState<string | null>(null);
	useEffect(() => {
		if (!code) return;
		const timer = setTimeout(() => setShown(code), 600);
		return () => clearTimeout(timer);
	}, [code]);
	return code !== null && shown !== code;
}

export function Referensi({ loading }: { loading: boolean }) {
	const [query, setQuery] = useState("");
	const [highlight, setHighlight] = useState(0);
	const view = useMemo(() => searchDummy(query), [query]);
	const regionCode = view.kind === "region" ? view.code : null;
	const detailLoading = useDetailLoading(regionCode);

	const update = (value: string) => {
		setQuery(value);
		setHighlight(0);
	};
	const options = view.kind === "suggest" ? suggestions(query) : null;
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
	if (view.kind === "region") {
		const detail = regionDetail(view.code);
		const others = otherCodes(detail);
		main = (
			<>
				<Hint>
					{detailLoading ? (
						<SkeletonText width="22em" />
					) : (
						"1 kode ditemukan, diurutkan dari kota lalu kabupaten."
					)}
				</Hint>
				<RegionCard detail={detail} loading={detailLoading} />
				{others.length > 0 && (
					<>
						<Divider
							label={
								detailLoading ? (
									<SkeletonText width="11em" />
								) : (
									`Kode lain di ${detail.province}`
								)
							}
						/>
						{others.map((code) => (
							<RegionCard
								key={code}
								detail={regionDetail(code)}
								loading={detailLoading}
							/>
						))}
					</>
				)}
			</>
		);
		aside = <RegionAside code={view.code} loading={detailLoading} />;
	} else if (view.kind === "special") {
		const registration =
			query.trim().toUpperCase().replace(/\s+/g, " ") !== `CD ${view.number}`;
		main = (
			<>
				{registration && (
					<Hint>
						Dibaca sebagai kode diplomat CD {view.number}. Nomor urut registrasi tidak
						dipakai, jadi tidak ditampilkan.
					</Hint>
				)}
				<SpecialCard number={view.number} />
				<Divider label="Format pelat khusus" />
				<FormatCards />
			</>
		);
		aside = (
			<>
				<DiplomatList current={view.number} />
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
		main = <NoResult query={query.trim()} />;
		aside = <SearchHelp />;
	} else {
		main = <RegionList loading={loading} />;
		aside =
			view.kind === "suggest" ? (
				<SearchHelp />
			) : (
				<>
					<SpecialCodesCard loading={loading} />
					<SeenCard loading={loading} />
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
			<div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="relative">
						<SearchBox
							value={query}
							onChange={update}
							onKeyDown={onKeyDown}
							expanded={view.kind === "suggest"}
							active={optionCodes.length ? highlight : null}
						/>
						{view.kind === "suggest" && (
							<Suggest query={query} highlight={highlight} onPick={update} />
						)}
					</div>
					{main}
				</div>
				<aside className="flex min-w-0 flex-col gap-5">{aside}</aside>
			</div>
		</>
	);
}
