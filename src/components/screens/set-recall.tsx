"use client";
import { useSessionView } from "@/components/learning/session-view";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";
import { ANSWER_MAX_CHARS } from "@/rules";

const previewProgress = { found: 3, threshold: 5, total: 12, percent: 60 };

const previewAnswers = [
	{ name: "Medan", correct: true },
	{ name: "Binjai", correct: true },
	{ name: "Deli Serdang", correct: true },
	{ name: "Padang", correct: false, note: "BA — dicatat sebagai tertukar" }
];

export function SetRecallScreen() {
	const view = useSessionView();
	const answers = view?.items ?? previewAnswers;
	const found = view?.items.filter((item) => item.correct).length ?? 0;
	const threshold = view?.question?.setTarget ?? 5;
	const progress = view
		? {
				found,
				threshold,
				total: view.question?.targets.length ?? 0,
				percent: Math.min(100, (found / threshold) * 100)
			}
		: previewProgress;

	return (
		<SessionShell
			current={21}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-grape-100 text-ink-1000">
						{view?.intro ? "Materi baru · tebak dulu" : "Sebutkan sebanyak mungkin"}
					</ModeBadge>
					<LevelChip level={3} filled={3} icon={null} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-3">
				<LabelText>sebutkan wilayah kode ini</LabelText>
				<div className="flex items-center gap-3">
					<CodeBadge code={view?.plate.code ?? "BK"} group="sumatera" size="lg" />
					<span className="font-mono text-heading font-bold text-ink-1000">
						{progress.found} / {progress.threshold}
					</span>
					<span className="font-mono text-body-sm font-medium text-ink-500">
						ambang {progress.threshold} dari {progress.total}
					</span>
				</div>
			</div>
			<div className="h-2 overflow-hidden rounded-xs bg-ink-100">
				<div
					className="h-full bg-group-sumatera"
					style={{ width: `${progress.percent}%` }}
				/>
			</div>
			<div className="flex flex-col gap-2">
				{answers.map((answer) => (
					<div
						key={answer.name}
						className={cn(
							"flex items-center gap-3 rounded-sm border p-3",
							answer.correct
								? "border-go-500 bg-go-100"
								: "border-stop-500 bg-stop-100"
						)}
					>
						{answer.correct ? (
							<Check className="size-4 shrink-0" aria-hidden />
						) : (
							<X className="size-4 shrink-0" aria-hidden />
						)}
						<span className="flex-1 text-body-md leading-[1.3] text-ink-1000">
							{answer.name}
						</span>
						{answer.note ? (
							<span className="font-mono text-micro text-stop-700">
								{answer.note}
							</span>
						) : null}
					</div>
				))}
			</div>
			<Input
				placeholder="Tambah jawaban…"
				aria-label="Tambah jawaban"
				value={view?.value}
				onChange={(event) => view?.setValue(event.target.value)}
				disabled={view?.busy}
				maxLength={ANSWER_MAX_CHARS}
			/>
			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" kbd="Enter" disabled={view?.busy} onClick={view?.add}>
					Tambah
				</Button>
				<Button disabled={view?.busy} onClick={() => view?.submit()}>
					Selesai
				</Button>
			</div>
			<Callout title="Tanpa penalti">
				Urutan bebas, tanpa batas waktu. Berhenti kapan saja tanpa penalti — nilainya jumlah
				yang berhasil disebut, bukan rasio terhadap total.
			</Callout>
		</SessionShell>
	);
}
