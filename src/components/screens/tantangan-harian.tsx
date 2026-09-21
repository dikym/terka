"use client";
import { useSessionView } from "@/components/learning/session-view";
import { challengeStreak } from "@/lib/terka/statistics";
import { islandGroup } from "@/components/learning/presentation";
import { cn } from "@/lib/utils";
import { Flame, Medal, CornerDownLeft } from "lucide-react";
import { LabelText } from "@/components/ui/label-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody } from "@/components/ui/card";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";

const previewProgress = { current: 3, total: 5, filled: 3, segments: 5 };
const previewStreak = 17;

export function TantanganHarian() {
	const view = useSessionView();
	const progress = view
		? { current: view.session.answered, total: 5, filled: view.session.answered, segments: 5 }
		: previewProgress;
	const streak = view ? challengeStreak(view.progress).streak : previewStreak;

	return (
		<div className="flex min-h-dvh flex-col bg-paper-0">
			<header className="flex flex-wrap items-center justify-between gap-8 border-b border-ink-200 bg-paper-0 px-6 py-4">
				<span className="inline-flex shrink-0 items-center gap-4">
					<ModeBadge className="bg-caution-100 text-ink-1000">Tantangan Harian</ModeBadge>
					<span className="inline-flex items-center gap-1.5 text-ink-900">
						<Flame className="size-4.5 shrink-0 text-tangerine-500" aria-hidden />
						<span className="font-mono text-subhead leading-none font-bold">
							{streak}
						</span>
						<LabelText>Hari Beruntun</LabelText>
					</span>
				</span>
				<span className="flex min-w-0 flex-1 gap-0.75">
					{Array.from({ length: progress.segments }, (_, i) => (
						<span
							key={i}
							className={cn(
								"h-2.5 flex-1 rounded-xs",
								i < progress.filled ? "bg-caution-500" : "bg-ink-100"
							)}
						/>
					))}
				</span>
				<span className="inline-flex shrink-0 items-baseline gap-2">
					<span className="font-mono text-subhead leading-none font-bold text-ink-1000 tabular-nums">
						{progress.current}
					</span>
					<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
						dari {progress.total}
					</span>
					<LabelText>soal terjawab</LabelText>
				</span>
			</header>
			<div className="flex flex-1 justify-center px-4 py-6 sm:px-8 sm:py-10">
				<div className="flex w-full max-w-180 flex-col gap-5">
					<Card accent="balinusra">
						<CardBody>
							<div className="flex items-center justify-between gap-3">
								<span className="text-body-md leading-[1.3] text-ink-900">
									{`Soal ${(view?.session.answered ?? 3) + 1}`}
								</span>
								<LevelChip
									level={view?.question?.level ?? 3}
									filled={view?.question?.level ?? 3}
									icon={Medal}
								/>
							</div>
							<div className="flex items-center gap-3">
								<CodeBadge
									code={view?.plate.code ?? "DR"}
									group={
										view
											? islandGroup(
													view.content.regions.find(
														(region) =>
															region.id === view.question?.regionId
													)?.group ?? "bali-nusra"
												)
											: "balinusra"
									}
									className="h-10 min-w-10 text-subhead"
								/>
								<span className="font-mono text-body-sm font-medium text-ink-500">
									{view ? `Level ${view.question?.level}` : "Tanpa Petunjuk"}
								</span>
							</div>
						</CardBody>
					</Card>
					<Button
						disabled={view?.busy}
						onClick={view?.next}
						block
						kbd="Enter"
						iconRight={<CornerDownLeft className="size-4" aria-hidden />}
					>
						Lanjut
					</Button>
					<Callout title="Jadwal tidak berubah" titleClassName="text-warn-700">
						Soal diambil dari seluruh kartu yang pernah dipelajari, tanpa memandang
						Cakupan. Jawaban di sini tidak mengubah jadwal.
					</Callout>
					<div className="flex items-center justify-between gap-2">
						<LabelText>Jatah toleransi</LabelText>
						<span className="font-mono text-body-sm font-medium text-ink-500">
							{`${view && !challengeStreak(view.progress).graceAvailable ? 0 : 1} tersisa dalam 30 hari`}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
