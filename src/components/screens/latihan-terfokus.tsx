"use client";
import { useRouter } from "next/navigation";
import { useLearning, useNow } from "@/components/learning/learning-provider";
import { islandGroup } from "@/components/learning/presentation";
import { buildHierarchy, inScope } from "@/lib/terka/content";
import { scopeStats } from "@/lib/terka/statistics";
import { scopeName, percent } from "@/lib/terka/practice";
import { selectScope } from "@/lib/terka/engine";
import { Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { LabelText } from "@/components/ui/label-text";
import { IconButton } from "@/components/ui/icon-button";
import { CodeBadge } from "@/components/terka/code-badge";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { ModeBadge } from "@/components/terka/mode-badge";

export function LatihanTerfokus({ level, id }: { level?: string; id?: string }) {
	const { progress, content, busy, act, start } = useLearning();
	const router = useRouter();
	const now = useNow();
	const scope =
		buildHierarchy(content).find((node) => node.level === level && node.id === id) ??
		progress.activeScope;
	const selected = content.regions.filter((region) => inScope(region, scope));
	const cards = progress.cards.filter((card) =>
		selected.some((region) => region.id === card.regionId)
	);
	const stats = scopeStats(progress, content, scope);
	const region = {
		name: scopeName(content, scope),
		meta: `${selected.length} kode · ${stats.totalCards} kartu`
	};
	const codes = selected.map((region) => ({
		code: region.code,
		name: region.region,
		group: islandGroup(region.group),
		percent: percent(scopeStats(progress, content, { level: "code", id: region.id }).mastery)
	}));
	const learned = cards.some((card) => card.reps > 0 && card.state !== "suspended");
	const due = {
		count: cards.filter(
			(card) => card.state !== "new" && card.state !== "suspended" && card.due <= now
		).length,
		note: "soal — juga dihitung untuk jadwal hari ini"
	};

	return (
		<>
			<header className="flex items-center border-b border-ink-200 bg-paper-0 px-5 py-4">
				<PageTitle
					back="/"
					size="sm"
					className="flex-1"
					actions={
						<IconButton label="Setelan" onClick={() => router.push("/setelan")}>
							<Settings className="size-4.5" aria-hidden />
						</IconButton>
					}
				>
					Latihan Terfokus
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="lg:grid-cols-[minmax(0,1fr)_300px]"
					aside={
						<>
							<Callout
								tone="warn"
								className="border-ink-200"
								title="Jadwal tidak berubah"
								titleClassName="text-warn-700"
							>
								Latihan tambahan. Jawabannya dicatat untuk statistik dan kode yang
								sering tertukar, tetapi jadwal kartu yang belum perlu diulang tidak
								berubah.
							</Callout>
							<div className="flex flex-col gap-1 px-1">
								<LabelText>perlu diulang di wilayah ini</LabelText>
								<div className="flex items-baseline gap-2">
									<span className="font-mono text-subhead leading-none font-bold text-ink-1000 tabular-nums">
										{due.count}
									</span>
									<span className="text-body-sm leading-[1.3] text-ink-500">
										{due.note}
									</span>
								</div>
							</div>
						</>
					}
				>
					<div className="flex flex-col gap-2">
						<ModeBadge className="bg-info-100 text-ink-1000">
							Latihan Terfokus
						</ModeBadge>
						<h2 className="font-display text-title font-bold text-ink-1000">
							{region.name}
						</h2>
						<span className="font-mono text-body-sm font-medium text-ink-500">
							{region.meta}
						</span>
					</div>
					<div className="flex flex-col gap-2">
						{codes.map((row) => (
							<div
								key={row.code}
								className="flex items-center gap-3 rounded-sm border border-ink-200 bg-paper-0 p-3"
							>
								<CodeBadge code={row.code} group={row.group} size="sm" />
								<span className="flex-1 text-body-md leading-[1.3] text-ink-900">
									{row.name}
								</span>
								<span className="font-mono text-micro font-medium text-ink-500">
									{row.percent}
								</span>
							</div>
						))}
					</div>
					<Button
						disabled={busy || !learned}
						title={
							!learned
								? "Pelajari kartu lewat sesi harian terlebih dahulu."
								: undefined
						}
						onClick={() => void start("focused", scope)}
						variant="secondary"
						block
						iconRight={<Target className="size-4" aria-hidden />}
					>
						Latih wilayah ini
					</Button>
					<Button
						disabled={busy}
						onClick={() =>
							void act((current, data) => selectScope(current, data, scope))
						}
						variant="ghost"
						size="sm"
						block
					>
						Pilih wilayah ini
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
