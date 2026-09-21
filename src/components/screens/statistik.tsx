"use client";
import { useLearning, useNow } from "@/components/learning/learning-provider";
import { buildHierarchy } from "@/lib/terka/content";
import { forecast, scopeStats, weakCards } from "@/lib/terka/statistics";
import { dateLabel, scopeName } from "@/lib/terka/practice";
import { islandGroup, groupStrokes } from "@/components/learning/presentation";
import { cardStateLabels } from "@/components/terka/card-state-badge";
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
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { cn } from "@/lib/utils";

export function Statistik() {
	const { progress, content } = useLearning();
	const now = useNow();
	const weakestCards = weakCards(progress)
		.slice(0, 4)
		.map(({ card, accuracy }) => {
			const region = content.regions.find((region) => region.id === card.regionId)!;
			return {
				id: card.cardId,
				code: region.code,
				group: islandGroup(region.group),
				name: region.region,
				badgeClassName: "bg-paper-50 text-ink-700",
				label: cardStateLabels[card.state],
				accuracy: Math.round((accuracy ?? 0) * 100)
			};
		});
	const days = forecast(progress, content, now).map((day) => ({
		day: day.day,
		count: Object.values(day.groups).reduce((sum, count) => sum + count, 0)
	}));
	const maximum = Math.max(40, ...days.map((day) => day.count));
	const reviewForecast = days.map((day) => ({
		...day,
		heightPercent: (day.count / maximum) * 100,
		className: day.count > 40 ? "bg-caution-500" : "bg-ink-300"
	}));
	const reviewThresholdPercent = (40 / maximum) * 100;
	const regionalMastery = buildHierarchy(content)
		.filter((node) => node.level === "group")
		.slice(0, 4)
		.map((node) => ({
			name: scopeName(content, node),
			strokeClassName: groupStrokes[islandGroup(node.id)],
			levels: scopeStats(progress, content, node).levels.map((level) =>
				level.total ? (level.passed / level.total) * 100 : 0
			)
		}));
	const national = scopeStats(progress, content, { level: "national", id: "indonesia" });
	const mastery = { label: "Kartu Dikuasai", percent: Math.round(national.mastery * 100) };
	const leech = {
		count: progress.cards.filter((card) => card.lapses >= 6).length,
		disabled: national.suspendedCards
	};
	const backup = {
		file: "terka-progress.json",
		note: `Terakhir dicadangkan: ${dateLabel(progress.lastBackupAt)}`
	};

	return (
		<PageFrame>
			<PageTitle>Statistik</PageTitle>
			<TwoColumn
				className="lg:grid-cols-[minmax(0,1fr)_320px]"
				aside={
					<>
						<div className="flex flex-col gap-2">
							<div className="flex justify-between">
								<LabelText>{mastery.label}</LabelText>
								<span className="font-mono text-label font-semibold text-ink-900">
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
						<div className="overflow-hidden rounded-md border border-ink-200 bg-paper-0 text-ink-1000">
							<div className="h-0.75 bg-go-500" aria-hidden />
							<div className="flex flex-col gap-3 p-4">
								<LabelText>Cadangan</LabelText>
								<div className="flex flex-col gap-1.5">
									<span className="font-mono text-body-md leading-[1.3] font-medium break-all text-ink-1000">
										{backup.file}
									</span>
									<span className="text-body-sm text-ink-500">{backup.note}</span>
								</div>
								<Link
									href="/cadangan"
									className={cn(
										buttonVariants({
											variant: "quiet",
											size: "sm",
											block: true
										}),
										"border-ink-1000"
									)}
								>
									Perbarui cadangan
								</Link>
							</div>
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
								<div key={row.id} className="flex items-center gap-3">
									<CodeBadge code={row.code} group={row.group} />
									<span className="min-w-0 flex-1 truncate text-body-md text-ink-900">
										{row.name}
									</span>
									<Badge
										dot
										className={cn(
											"shrink-0 whitespace-nowrap normal-case",
											row.badgeClassName
										)}
									>
										{row.label}
									</Badge>
									<span className="shrink-0 font-mono text-body-md leading-none font-semibold text-stop-700">
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
						<div className="relative h-24 border-b border-ink-200">
							<div
								className="absolute inset-x-0 border-t border-dashed border-ink-300"
								style={{ bottom: `${reviewThresholdPercent}%` }}
								aria-hidden
							/>
							<div className="relative flex h-full items-end gap-1">
								{reviewForecast.map((bar, i) => (
									<div
										key={i}
										className={cn("flex-1 rounded-t-xs", bar.className)}
										style={{ height: `${bar.heightPercent}%` }}
										title={`${bar.day}: ${bar.count} kartu`}
										role="img"
										aria-label={`${bar.day}: ${bar.count} kartu`}
									/>
								))}
							</div>
						</div>
						<div className="mt-2 flex justify-between font-mono text-micro leading-none text-ink-500">
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
							{regionalMastery.map((item) => (
								<div key={item.name} className="flex flex-col items-center gap-2">
									<RingGauge
										size={78}
										viewBoxSize={88}
										strokeWidth={6}
										gap={2}
										rings={item.levels.map((value) => ({
											value,
											className: item.strokeClassName
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
							<CardTitle>
								<Link href="/peta">Peta Penguasaan</Link>
							</CardTitle>
							<LabelText>STATIS</LabelText>
						</header>
						<MapPlaceholder className="aspect-auto h-37.5" />
						<div className="mt-3 flex flex-wrap gap-2">
							<Badge dot className="bg-go-100 text-go-700">
								tuntas
							</Badge>
							<Badge dot className="bg-sky-100 text-ink-700">
								berjalan
							</Badge>
							<Badge
								dot
								className="border border-ink-200 bg-transparent text-ink-700"
							>
								belum dibuka
							</Badge>
						</div>
					</div>
				</Card>
			</TwoColumn>
		</PageFrame>
	);
}
