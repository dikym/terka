"use client";
import { useSessionView } from "@/components/learning/session-view";
import { scopeName } from "@/lib/terka/practice";
import { islandGroup } from "@/components/learning/presentation";
import { Trophy } from "lucide-react";
import { LabelText } from "@/components/ui/label-text";
import { StatBlock } from "@/components/ui/stat-block";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";

const previewStats = { correct: 23, secondsLeft: 38, timeUsedPercent: 63 };
const previewOptions = ["Nusa Tenggara Timur", "Nusa Tenggara Barat", "Bali", "Maluku"];
const previewRecord = { region: "Kawasan Bali & Nusa Tenggara", best: 31 };

export function SprintScreen() {
	const view = useSessionView();
	const stats = view
		? {
				correct: view.session.correct,
				secondsLeft: view.secondsLeft,
				timeUsedPercent: (view.secondsLeft / 60) * 100
			}
		: previewStats;
	const options = view?.question?.choices ?? previewOptions;
	const record = view
		? {
				region: scopeName(view.content, view.session.scope),
				best:
					view.progress.bestScores[
						`${view.session.scope.level}:${view.session.scope.id}`
					] ?? 0
			}
		: previewRecord;

	return (
		<div className="flex min-h-dvh flex-col bg-paper-0">
			<header className="flex items-center gap-5 border-b border-ink-200 bg-paper-0 px-6 py-4">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span className="inline-flex w-fit items-center rounded-pill bg-paper-50 px-2.5 py-1 font-display text-label font-semibold text-ink-1000 uppercase">
							{view
								? scopeName(view.content, view.session.scope)
								: "BALI & NUSA TENGGARA"}
						</span>
						<span className="inline-flex shrink-0 items-center gap-3">
							<ModeBadge className="bg-stop-100 text-ink-1000">Mode Kilat</ModeBadge>
							<LevelChip level={1} filled={1} icon={null} />
						</span>
					</div>
				</div>
			</header>
			<div className="flex flex-1 justify-center px-4 py-6 sm:px-8 sm:py-10">
				<div className="flex w-full max-w-180 flex-col gap-5">
					<div className="grid grid-cols-2 items-end gap-5">
						<StatBlock
							value={stats.correct}
							label="benar"
							size="hero"
							valueClassName="text-go-700"
						/>
						<StatBlock
							value={stats.secondsLeft}
							unit="detik"
							label="sisa waktu"
							size="display"
							unitClassName="text-body-sm text-ink-500 leading-none font-mono font-medium"
						/>
					</div>
					<ProgressBar
						value={stats.timeUsedPercent}
						tone="danger"
						className="h-2.5 rounded-xs"
					/>
					<div className="flex flex-col items-start gap-4">
						<LabelText>{view?.question?.prompt ?? "pilih wilayahnya"}</LabelText>
						<CodeBadge
							code={view?.plate.code ?? "EB"}
							group={
								view
									? islandGroup(
											view.content.regions.find(
												(region) => region.id === view.question?.regionId
											)?.group ?? "bali-nusra"
										)
									: "balinusra"
							}
							size="lg"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						{options.map((label) => (
							<button
								key={label}
								disabled={view?.busy}
								onClick={() => view?.submit([label])}
								type="button"
								className="flex min-h-control items-center justify-center rounded-sm border border-ink-1000 bg-paper-0 p-2 text-center font-display text-body-sm leading-[1.25] font-semibold text-ink-1000 shadow-block transition duration-90 ease-out hover:bg-paper-50 active:translate-0.5 active:shadow-none motion-reduce:transition-none"
							>
								{label}
							</button>
						))}
					</div>
					<div className="flex items-center justify-between gap-3 border-t border-ink-200 pt-3">
						<span className="inline-flex items-center gap-2">
							<Trophy className="size-4 shrink-0" aria-hidden />
							<LabelText>Rekor terbaik di {record.region}</LabelText>
						</span>
						<span className="font-mono text-body-lg font-bold text-ink-1000">
							{record.best}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
