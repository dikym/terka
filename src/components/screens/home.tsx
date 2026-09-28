"use client";
import { useLearning, useNow } from "@/components/learning/learning-provider";
import { dailyQueue, learnedCards, nextDailyAt } from "@/lib/terka/engine";
import { scopeStats, challengeStreak } from "@/lib/terka/statistics";
import { modeDone, scopeName } from "@/lib/terka/practice";
import Link from "next/link";
import { ChevronRight, Flame, Play, Target, Zap } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { LabelText } from "@/components/ui/label-text";
import { buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { PageFrame } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { cn } from "@/lib/utils";

function countdown(ms: number) {
	const total = Math.ceil(ms / 1000);
	return [total / 3600, (total / 60) % 60, total % 60]
		.map((part) => String(Math.floor(part)).padStart(2, "0"))
		.join(":");
}

export function HomeScreen() {
	const { progress, content, start, busy } = useLearning();
	const now = useNow();
	const queue = dailyQueue(progress, content, now);
	const stats = scopeStats(progress, content, progress.activeScope);
	const untilNextDay = progress.clock.nextBoundary - now;
	const dailyDone = modeDone(progress, content, "daily", now);
	const challengeDone = modeDone(progress, content, "challenge", now);
	const challengeReady = learnedCards(progress, content).length > 0;
	const beranda = {
		due: queue.filter((item) => item.priority < 4).length,
		streak: challengeStreak(progress).streak,
		scope: {
			name: scopeName(content, progress.activeScope),
			mastered: Math.round(stats.mastery * 100),
			fresh: queue.filter((item) => item.priority === 4).length,
			outside: progress.cards.length - stats.totalCards
		}
	};

	return (
		<PageFrame>
			<TwoColumn
				aside={
					<div className="flex flex-col gap-3">
						<Link
							href="/sesi"
							aria-disabled={busy || dailyDone}
							onClick={(event) => {
								event.preventDefault();
								if (!busy && !dailyDone) void start("daily");
							}}
							className={buttonVariants({
								variant: "primary",
								size: "lg",
								block: true
							})}
						>
							<Play className="size-4.5" aria-hidden />
							<span>Mulai belajar</span>
							{dailyDone ? (
								<span className="ml-1 font-mono text-micro font-medium tabular-nums opacity-70">
									{countdown(nextDailyAt(progress, content, now) - now)}
								</span>
							) : (
								<Kbd className="ml-1">Enter</Kbd>
							)}
						</Link>
						<Link
							href="/tantangan"
							aria-disabled={busy || challengeDone || !challengeReady}
							onClick={(event) => {
								event.preventDefault();
								if (!busy && !challengeDone && challengeReady)
									void start("challenge");
							}}
							className={cn(
								buttonVariants({ variant: "stop", size: "md", block: true }),
								"px-4"
							)}
						>
							<Target className="size-4" aria-hidden />
							<span>Tantangan Harian</span>
							<span className="font-mono text-micro font-medium tabular-nums opacity-70">
								{challengeDone
									? countdown(untilNextDay)
									: challengeReady
										? "5 soal"
										: "Belajar dulu"}
							</span>
						</Link>
						<Link
							href="/kilat"
							aria-disabled={busy}
							onClick={(event) => {
								event.preventDefault();
								if (!busy) void start("sprint");
							}}
							className={cn(
								buttonVariants({ variant: "confirm", size: "md", block: true }),
								"px-4"
							)}
						>
							<Zap className="size-4" aria-hidden />
							<span>Mode Kilat</span>
							<span className="font-mono text-micro font-medium opacity-70">
								60 detik
							</span>
						</Link>
					</div>
				}
			>
				<div className="flex items-end justify-between">
					<div className="flex flex-col items-start gap-1">
						<div className="flex items-baseline gap-2">
							<span className="font-display text-hero font-bold text-ink-1000 tabular-nums">
								{beranda.due}
							</span>
							<span className="font-mono text-body-sm font-medium text-ink-500">
								soal
							</span>
						</div>
						<LabelText>perlu diulang hari ini</LabelText>
					</div>
					<span className="inline-flex items-center gap-1.5 text-ink-900">
						<Flame className="size-4.5 shrink-0 text-tangerine-500" aria-hidden />
						<span className="font-mono text-subhead font-bold">{beranda.streak}</span>
						<LabelText>Hari Beruntun</LabelText>
					</span>
				</div>
				<Link href="/cakupan" className="block">
					<Card accent="balinusra">
						<div className="p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div className="flex flex-col items-start gap-1">
									<LabelText>Cakupan</LabelText>
									<CardTitle>{beranda.scope.name}</CardTitle>
								</div>
								<ChevronRight
									className="size-4.5 shrink-0 text-ink-900"
									aria-hidden
								/>
							</div>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<LabelText>materi Dikuasai</LabelText>
										<span className="font-mono text-label font-semibold text-ink-900 uppercase">
											{beranda.scope.mastered}%
										</span>
									</div>
									<div className="h-2 overflow-hidden rounded-xs bg-ink-100">
										<div
											className="h-full bg-group-balinusra"
											style={{ width: `${beranda.scope.mastered}%` }}
										/>
									</div>
								</div>
								<div className="flex items-center justify-between text-body-md text-ink-900">
									<span>{beranda.scope.fresh} materi baru tersedia</span>
									<span className="font-mono text-ink-500">
										{beranda.scope.outside} di luar Cakupan
									</span>
								</div>
							</div>
						</div>
					</Card>
				</Link>
			</TwoColumn>
		</PageFrame>
	);
}
