import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LabelText } from "@/components/ui/label-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RingGauge } from "@/components/ui/ring-gauge";
import { buttonVariants } from "@/components/ui/button";
import { MapPlaceholder } from "@/components/terka/map-placeholder";
import { CodeBadge } from "@/components/terka/code-badge";
import type { IslandGroup } from "@/components/terka/scope-node";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { cn } from "@/lib/utils";

function WeakBadge({
	tone,
	className,
	children
}: React.PropsWithChildren<{ tone: string; className?: string }>) {
	return (
		<Badge dot className={cn("shrink-0 whitespace-nowrap normal-case", tone, className)}>
			{children}
		</Badge>
	);
}

function MapLegend({ tone, children }: React.PropsWithChildren<{ tone: string }>) {
	return (
		<Badge dot className={cn("w-fit shrink-0 self-start whitespace-nowrap", tone)}>
			{children}
		</Badge>
	);
}

const weakestCards: {
	code: string;
	group: IslandGroup;
	name: string;
	badgeTone: string;
	label: string;
	accuracy: number;
}[] = [
	{
		code: "BD",
		group: "sumatera",
		name: "Dharmasraya",
		badgeTone: "bg-stop-100 text-state-relearning",
		label: "Sedang Dipelajari",
		accuracy: 42
	},
	{
		code: "DP",
		group: "sulawesi",
		name: "Sulsel (11 kab.)",
		badgeTone: "bg-paper-50 text-state-leech",
		label: "Sulit Dikuasai",
		accuracy: 51
	},
	{
		code: "PY",
		group: "papua",
		name: "Papua Barat Daya",
		badgeTone: "bg-caution-100 text-state-learning",
		label: "Sedang Dipelajari",
		accuracy: 58
	},
	{
		code: "DH",
		group: "balinusra",
		name: "Timor",
		badgeTone: "bg-sky-100 text-state-review",
		label: "Sedang Dipelajari",
		accuracy: 63
	}
];

const load = [
	{ h: 38.71, tone: "bg-ink-1000" },
	{ h: 58.06, tone: "bg-ink-300" },
	{ h: 29.03, tone: "bg-ink-300" },
	{ h: 77.42, tone: "bg-ink-300" },
	{ h: 100, tone: "bg-caution-500" },
	{ h: 45.16, tone: "bg-ink-300" },
	{ h: 22.58, tone: "bg-ink-300" },
	{ h: 70.97, tone: "bg-ink-300" },
	{ h: 51.61, tone: "bg-ink-300" },
	{ h: 35.48, tone: "bg-ink-300" },
	{ h: 90.32, tone: "bg-caution-500" },
	{ h: 61.29, tone: "bg-ink-300" },
	{ h: 25.81, tone: "bg-ink-300" },
	{ h: 41.94, tone: "bg-ink-300" }
];

const loadThreshold = 80.65;

const depth = [
	{ name: "Maluku", strokeClass: "stroke-group-maluku", levels: [100, 100, 100] },
	{ name: "Bali & Nusra", strokeClass: "stroke-group-balinusra", levels: [100, 78, 46] },
	{ name: "Jawa", strokeClass: "stroke-group-jawa", levels: [64, 34, 12] },
	{ name: "Papua", strokeClass: "stroke-group-papua", levels: [20, 6, 0] }
];

const mastery = { label: "Kode depan Dikuasai", percent: 26 };
const leech = { count: 3, disabled: 2 };
const backup = { note: "Terakhir dicadangkan 2 hari lalu" };

export function Statistik() {
	return (
		<PageFrame>
			<PageTitle>Statistik</PageTitle>
			<TwoColumn
				className="grid-cols-[minmax(0,1fr)_320px]"
				aside={
					<>
						<div className="flex flex-col gap-2">
							<div className="flex justify-between">
								<LabelText>{mastery.label}</LabelText>
								<span className="text-label text-ink-900 font-mono">
									{mastery.percent}%
								</span>
							</div>
							<ProgressBar value={mastery.percent} tone="success" className="h-2" />
						</div>
						<Card accent="grape">
							<div className="flex flex-col gap-3 p-4">
								<header className="flex items-baseline justify-between gap-3">
									<CardTitle>Sulit Dikuasai</CardTitle>
									<LabelText>{leech.count} kartu</LabelText>
								</header>
								<span className="text-body-md text-ink-900">
									{leech.disabled} kartu dinonaktifkan dan perlu ditinjau.
								</span>
								<Link
									href="/kartu-sulit"
									className={cn(
										buttonVariants({
											variant: "quiet",
											size: "sm",
											block: true
										}),
										"border-ink-1000"
									)}
								>
									<span>Tinjau kartu</span>
									<ChevronRight className="size-4" aria-hidden />
								</Link>
							</div>
						</Card>
						<div className="border-ink-200 bg-paper-50 text-ink-1000 flex flex-col gap-3 rounded-md border p-4">
							<div className="flex items-baseline justify-between gap-3">
								<LabelText>Cadangan</LabelText>
								<span className="text-body-sm text-ink-900 font-mono font-medium">
									{backup.note}
								</span>
							</div>
							<Link
								href="/cadangan"
								className={buttonVariants({
									variant: "quiet",
									size: "sm",
									block: true
								})}
							>
								Perbarui cadangan
							</Link>
						</div>
					</>
				}
			>
				<Card>
					<div className="p-4">
						<header className="mb-3 flex items-baseline justify-between gap-3">
							<CardTitle>Kartu terlemah</CardTitle>
							<LabelText>AKURASI</LabelText>
						</header>
						<div className="flex flex-col gap-3">
							{weakestCards.map((row) => (
								<div key={row.code} className="flex items-center gap-3">
									<CodeBadge code={row.code} group={row.group} />
									<span className="text-body-md text-ink-900 min-w-0 flex-1 truncate">
										{row.name}
									</span>
									<WeakBadge tone={row.badgeTone}>{row.label}</WeakBadge>
									<span className="text-body-md text-stop-700 shrink-0 font-mono leading-none font-semibold">
										{row.accuracy}%
									</span>
								</div>
							))}
						</div>
					</div>
				</Card>
				<Card>
					<div className="p-4">
						<header className="mb-3 flex items-baseline justify-between gap-3">
							<CardTitle>Perkiraan beban</CardTitle>
							<LabelText>14 HARI</LabelText>
						</header>
						<div className="border-ink-200 relative h-24 border-b">
							<div
								className="border-ink-300 absolute inset-x-0 border-t border-dashed"
								style={{ bottom: `${loadThreshold}%` }}
								aria-hidden
							/>
							<div className="relative flex h-full items-end gap-1">
								{load.map((bar, i) => (
									<div
										key={i}
										className={cn(
											"border-ink-1000 flex-1 rounded-t-xs border border-b-0",
											bar.tone
										)}
										style={{ height: `${bar.h}%` }}
									/>
								))}
							</div>
						</div>
						<div className="text-micro text-ink-500 mt-2 flex justify-between font-mono leading-none">
							<span>hari ini</span>
							<span>ambang 40 soal</span>
							<span>+14</span>
						</div>
					</div>
				</Card>
				<Card>
					<div className="p-4">
						<header className="mb-3 flex items-baseline justify-between gap-3">
							<CardTitle>Kedalaman per kawasan</CardTitle>
							<LabelText>LEVEL 1 · 2 · 3</LabelText>
						</header>
						<div className="flex justify-between gap-2">
							{depth.map((item) => (
								<div key={item.name} className="flex flex-col items-center gap-2">
									<RingGauge
										size={78}
										stroke={6}
										gap={2}
										rings={item.levels.map((value) => ({
											value,
											className: item.strokeClass
										}))}
									/>
									<LabelText className="text-center">{item.name}</LabelText>
								</div>
							))}
						</div>
					</div>
				</Card>
				<Card>
					<div className="p-4">
						<header className="mb-3 flex items-baseline justify-between gap-3">
							<CardTitle>Peta Penguasaan</CardTitle>
							<LabelText>STATIS</LabelText>
						</header>
						<MapPlaceholder className="aspect-auto h-[150px]" />
						<div className="mt-3 flex flex-wrap gap-2">
							<MapLegend tone="bg-go-100 text-go-700">tuntas</MapLegend>
							<MapLegend tone="bg-sky-100 text-ink-700">berjalan</MapLegend>
							<MapLegend tone="border-ink-200 border bg-transparent text-ink-700">
								belum dibuka
							</MapLegend>
						</div>
					</div>
				</Card>
			</TwoColumn>
		</PageFrame>
	);
}
