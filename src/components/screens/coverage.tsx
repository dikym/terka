"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeChip } from "@/components/ui/code-chip";
import { Skeleton, SkeletonText, skeletonWidth } from "@/components/ui/feedback";
import { GROUP_BG, GROUP_IDS, GROUP_NAME, type GroupId } from "@/components/ui/groups";
import { Icon } from "@/components/ui/icon";
import type { Coverage, Province } from "@/lib/view/coverage";
import { keyAction } from "@/lib/keys";

export type Node = "national" | GroupId;

const nodeTitle = (node: Node) =>
	node === "national" ? "Seluruh Indonesia" : `Kawasan ${GROUP_NAME[node]}`;

function Meter({
	percent,
	color,
	loading,
	label
}: {
	percent: number;
	color: string;
	loading: boolean;
	label: string;
}) {
	return (
		<span className="flex items-center gap-2">
			<span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-xs bg-ink-100">
				{!loading && (
					<span className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
				)}
			</span>
			<span className="min-w-9 flex-none text-right font-mono text-body-sm leading-none font-medium text-ink-900">
				{loading ? <SkeletonText width={skeletonWidth(label)} /> : label}
			</span>
		</span>
	);
}

// Phones indent less and pad nested rows tighter to keep room for the code chips.
const INDENT = ["p-3", "ml-3 px-3 py-2 lg:ml-5 lg:py-3", "ml-6 px-3 py-2 lg:ml-10 lg:py-3"];

function Row({
	node,
	indent,
	state,
	chevron,
	dot,
	onClick,
	onToggle,
	children
}: {
	indent: 0 | 1 | 2;
	state: "idle" | "highlight" | "active";
	chevron?: "open" | "closed";
	dot: string;
	onClick?: () => void;
	/** The node this row highlights; Enter on the highlighted row picks it. */
	node?: Node;
	onToggle?: () => void;
	children: React.ReactNode;
}) {
	const look = {
		idle: "border border-hairline bg-paper-0",
		highlight: "border-2 border-ink-1000 bg-paper-0 shadow-[2px_2px_0_var(--color-ink-1000)]",
		active: "border border-ink-1000 bg-paper-50"
	}[state];
	const Tag = onClick ? "button" : "div";
	return (
		<div
			className={`flex min-h-12 items-center gap-3 rounded-sm text-left ${INDENT[indent]} ${look}`}
		>
			{chevron && (
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={chevron === "open"}
					aria-label={chevron === "open" ? "Tutup" : "Buka"}
					className="grid size-6 flex-none cursor-pointer place-items-center"
				>
					<Icon name={chevron === "open" ? "chevron-down" : "chevron-right"} size={22} />
				</button>
			)}
			<Tag
				{...(onClick ? { type: "button" as const, onClick, "data-node": node } : {})}
				className={`flex min-w-0 flex-1 items-center gap-3 text-left ${onClick ? "cursor-pointer" : ""}`}
			>
				<span className={`size-2.5 flex-none dot ${dot}`} />
				<span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
			</Tag>
		</div>
	);
}

function NodeHeading({
	title,
	codes,
	loading
}: {
	title: string;
	codes: string;
	loading: boolean;
}) {
	return (
		<span className="flex items-baseline justify-between gap-2">
			<span className="min-w-0 font-display text-body-lg leading-[1.2] font-semibold tracking-title">
				{loading ? <SkeletonText width={skeletonWidth(title)} /> : title}
			</span>
			<span className="flex-none font-mono text-body-sm leading-none text-ink-500">
				{loading ? <SkeletonText width={skeletonWidth(codes)} /> : codes}
			</span>
		</span>
	);
}

function ProvinceRow({ province, group }: { province: Province; group: GroupId }) {
	return (
		<Row indent={2} state="idle" dot={GROUP_BG[group]}>
			<span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
				<span className="min-w-0 font-sans text-body-md leading-[1.2] font-medium tracking-title">
					{province.name}
				</span>
				<span className="flex flex-none justify-end gap-0.75">
					{province.codes.map((code) => (
						<CodeChip key={code} code={code} group={group} size="xs" />
					))}
				</span>
			</span>
			<Meter
				percent={province.percent}
				color={GROUP_BG[group]}
				loading={false}
				label={`${province.percent}%`}
			/>
		</Row>
	);
}

function Panel({
	node,
	active,
	data,
	onPick
}: {
	node: Node;
	active: boolean;
	data: Coverage | null;
	onPick: () => void;
}) {
	const loading = data === null;
	const group =
		node === "national" ? null : (data?.groups.find((item) => item.id === node) ?? null);
	const national = data?.national ?? EMPTY.national;
	const stats = group
		? { provinces: group.provinces.length, codes: group.codes, percent: group.percent }
		: national;
	const newAvailable = group ? group.newAvailable : national.newAvailable;
	const codes = group?.provinces.flatMap((province) => province.codes) ?? [];
	const bar = loading
		? "animate-skl bg-ink-100"
		: node !== "national"
			? GROUP_BG[node]
			: "bg-ink-1000";
	return (
		<section className="min-w-0 overflow-hidden rounded-md border border-hairline bg-paper-0 shadow-lift">
			<div className={`h-1 ${bar}`} />
			<div className="flex flex-col gap-4 p-4">
				<div className="flex flex-col gap-2">
					<span className="type-label text-ink-500">
						{active ? "Cakupan aktif" : "Wilayah disorot"}
					</span>
					<h2 className="font-display text-heading leading-snug font-bold">
						{loading ? <SkeletonText width="12em" /> : nodeTitle(node)}
					</h2>
				</div>
				<div className="grid grid-cols-3 gap-4">
					{[
						[stats.provinces, "provinsi", "1.2em"],
						[stats.codes, "kode", "1.2em"],
						[`${stats.percent}%`, "kemajuan", "2.2em"]
					].map(([value, label, width]) => (
						<span key={label} className="flex min-w-0 flex-col gap-0.75">
							<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
								{loading ? <SkeletonText width={width as string} /> : value}
							</span>
							<span className="font-sans text-micro leading-[1.2] text-ink-500">
								{label}
							</span>
						</span>
					))}
				</div>
				<div className="h-2 flex-none overflow-hidden rounded-xs bg-ink-100">
					{!loading && (
						<div className={`h-full ${bar}`} style={{ width: `${stats.percent}%` }} />
					)}
				</div>
				<div className="font-display text-body-lg leading-[1.3] font-semibold">
					{loading ? (
						<SkeletonText width="10.5em" />
					) : newAvailable ? (
						`${newAvailable} materi baru tersedia`
					) : (
						"Tidak ada materi baru di wilayah ini."
					)}
				</div>
				{(loading || node !== "national") && (
					<>
						<div className="flex flex-wrap gap-2">
							{loading
								? [1, 2, 3, 4].map((key) => (
										<Skeleton
											key={key}
											className="h-7 w-10 flex-none rounded-sm"
										/>
									))
								: codes.map((code) => (
										<CodeChip key={code} code={code} group={node as GroupId} />
									))}
						</div>
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							Rincian kab/kota setiap kode ada di Referensi.
						</p>
					</>
				)}
				<div className="flex flex-col gap-3">
					{loading ? (
						<Skeleton className="block h-12 w-full rounded-sm" />
					) : (
						<>
							{!active && (
								<Button
									block
									icon="check"
									kbd="Enter"
									className="px-4"
									onClick={onPick}
								>
									Pilih wilayah ini
								</Button>
							)}
							{group && (
								<Button
									variant="secondary"
									block
									icon="crosshair"
									className="px-4"
									href={`/sesi?mode=terfokus&scope=group:${group.bundleId}`}
								>
									Latih wilayah ini
								</Button>
							)}
						</>
					)}
					{!loading && group && !active && (
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							Latih wilayah ini membuka Latihan Terfokus tanpa mengubah Cakupan.
						</p>
					)}
				</div>
			</div>
		</section>
	);
}

// Stands in while loading: the tree keeps its seven groups.
const EMPTY: Coverage = {
	national: { provinces: 0, codes: 0, percent: 0, newAvailable: 0 },
	groups: GROUP_IDS.map((id) => ({
		id,
		bundleId: id,
		codes: 0,
		percent: 0,
		newAvailable: 0,
		provinces: []
	}))
};

export function CoverageScreen({
	data,
	active: saved,
	onPick
}: {
	data: Coverage | null;
	active: Node;
	onPick: (node: Node) => void;
}) {
	const loading = data === null;
	const coverage = data ?? EMPTY;
	const [highlight, setHighlight] = useState<Node | null>(null);
	const [open, setOpen] = useState<Set<GroupId>>(new Set());
	// The saved scope arrives a moment after the pick; until it changes, the picked node counts as active.
	const [picked, setPicked] = useState<{ node: Node; from: Node } | null>(null);
	const active = picked && picked.from === saved ? picked.node : saved;
	const shown = highlight ?? active;

	const toggle = (id: GroupId) =>
		setOpen((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	const pick = () => {
		if (highlight) {
			onPick(highlight);
			setPicked({ node: highlight, from: saved });
		}
		setHighlight(null);
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const action = keyAction(
				{ key: event.key, target: event.target as HTMLElement },
				"app"
			);
			if (!highlight || highlight === active) return;
			const target = event.target as HTMLElement;
			// A row button keeps focus after its click; Enter there picks instead of clicking again.
			const onHighlightedRow =
				event.key === "Enter" &&
				target.closest("[data-node]")?.getAttribute("data-node") === highlight;
			if (onHighlightedRow) event.preventDefault();
			if ((action === "confirm" && target === document.body) || onHighlightedRow) pick();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	const state = (node: Node) =>
		node === highlight && node !== active ? "highlight" : node === active ? "active" : "idle";

	return (
		<>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<h1 className="type-screen-title">Cakupan</h1>
				</div>
			</div>
			{/* On a phone the left column dissolves so the panel can sit between the intro and the tree. */}
			<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
				<div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
					<div className="flex items-center gap-2 font-sans text-body-sm leading-none font-medium text-ink-700">
						{shown === "national" ? (
							<span className="font-semibold text-ink-1000" aria-current="location">
								Seluruh Indonesia
							</span>
						) : (
							<>
								<button
									type="button"
									className="cursor-pointer text-ink-700"
									onClick={() => setHighlight("national")}
								>
									Seluruh Indonesia
								</button>
								<span className="text-ink-300" aria-hidden="true">
									/
								</span>
								<span
									className="font-semibold text-ink-1000"
									aria-current="location"
								>
									{loading ? <SkeletonText width="9em" /> : GROUP_NAME[shown]}
								</span>
							</>
						)}
					</div>
					<p className="font-sans text-body-sm leading-normal text-ink-500">
						Menelusuri hanya menyorot. Cakupan berganti setelah Pilih wilayah ini
						ditekan.
					</p>
					<div className="order-1 flex flex-col gap-2 lg:order-0">
						<Row
							node="national"
							indent={0}
							state={loading ? "idle" : state("national")}
							dot={loading ? "bg-ink-100" : "bg-ink-1000"}
							onClick={loading ? undefined : () => setHighlight("national")}
						>
							{state("national") === "active" && !loading && (
								<span className="type-label text-caution-700">Aktif sekarang</span>
							)}
							<NodeHeading
								title="Seluruh Indonesia"
								codes={`${coverage.national.codes} kode`}
								loading={loading}
							/>
							<Meter
								percent={coverage.national.percent}
								color="bg-ink-1000"
								loading={loading}
								label={`${coverage.national.percent}%`}
							/>
						</Row>
						{coverage.groups.map((group) => {
							const expanded = open.has(group.id) && !loading;
							return (
								<div key={group.id} className="contents">
									<Row
										node={group.id}
										indent={1}
										state={loading ? "idle" : state(group.id)}
										chevron={expanded ? "open" : "closed"}
										dot={loading ? "bg-ink-100" : GROUP_BG[group.id]}
										onClick={
											loading
												? undefined
												: () => {
														setHighlight(group.id);
														setOpen((current) =>
															new Set(current).add(group.id)
														);
													}
										}
										onToggle={() => toggle(group.id)}
									>
										{state(group.id) === "active" && !loading && (
											<span className="type-label text-caution-700">
												Aktif sekarang
											</span>
										)}
										<NodeHeading
											title={GROUP_NAME[group.id]}
											codes={`${group.codes} kode`}
											loading={loading}
										/>
										<Meter
											percent={group.percent}
											color={GROUP_BG[group.id]}
											loading={loading}
											label={`${group.percent}%`}
										/>
									</Row>
									{expanded &&
										group.provinces.map((province) => (
											<ProvinceRow
												key={province.id}
												province={province}
												group={group.id}
											/>
										))}
								</div>
							);
						})}
					</div>
					<div className="order-1 flex items-center justify-between gap-4 rounded-sm border border-ink-200 bg-paper-50 px-4 py-3 lg:order-0">
						<div className="flex min-w-0 flex-col gap-1">
							<span className="type-label text-ink-700">Aturan</span>
							<span className="text-ink-900 type-body">
								Cakupan hanya menentukan materi baru. Soal yang perlu diulang tetap
								muncul dari wilayah mana pun.
							</span>
						</div>
					</div>
				</div>
				<aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8">
					<Panel node={shown} active={shown === active} data={data} onPick={pick} />
				</aside>
			</div>
		</>
	);
}
