"use client";
import { useSessionView } from "@/components/learning/session-view";
import { TimerRow } from "@/components/terka/timer-row";
import { CornerDownLeft, Medal } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlateTile } from "@/components/terka/plate-tile";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";
import { TIMED_LIMIT_MS } from "@/rules";

const previewTimer = { value: 28, time: "2,2 s" };

export function TimedGuessScreen() {
	const view = useSessionView();
	const timer = view?.timer ?? previewTimer;
	return (
		<SessionShell
			current={11}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-caution-100 text-ink-1000">
						{view?.masteryTest ? "Uji penguasaan" : "Tebak berwaktu"}
					</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<TimerRow value={timer.value} tone="danger" time={timer.time} />
			<div className="flex flex-col items-start gap-4">
				<LabelText>{view?.question?.prompt ?? "BM dipakai daerah mana?"}</LabelText>
				<PlateTile code={view?.plate.code ?? "BM"} size="lg" emphasize="code" />
			</div>
			<Input
				placeholder="Ketik jawaban…"
				aria-label="Ketik jawaban"
				value={view?.value}
				onChange={(event) => view?.setValue(event.target.value)}
				disabled={view?.busy}
				maxLength={500}
				autoComplete="off"
			/>
			<Button
				disabled={view?.busy}
				onClick={() => view?.submit()}
				block
				kbd="Enter"
				iconRight={<CornerDownLeft className="size-4" aria-hidden />}
			>
				Periksa
			</Button>
			<p className="text-body-sm leading-[1.4] text-ink-500">
				Mulai mengetik dalam {(view?.question?.limitMs ?? TIMED_LIMIT_MS) / 1000} detik.
				Lewat batas, soal ditutup dengan <span className="font-mono">Waktu habis</span>.
			</p>
		</SessionShell>
	);
}
