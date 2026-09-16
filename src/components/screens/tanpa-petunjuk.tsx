import { Clock, CornerDownLeft, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PlateTile } from "@/components/terka/plate-tile";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const timer = { value: 28, time: "2,2 s" };

export function TimerRow({
	value,
	tone,
	time,
	className
}: {
	value: number;
	tone: "danger" | "success";
	time: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<Clock className="size-4 shrink-0" aria-hidden />
			<ProgressBar value={value} tone={tone} className="rounded-xs" />
			<span className="text-body-lg text-ink-1000 shrink-0 font-mono font-bold tabular-nums">
				{time}
			</span>
		</div>
	);
}

export function TanpaPetunjuk() {
	return (
		<SessionShell
			current={11}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-caution-100 text-ink-1000">Tanpa Petunjuk</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<TimerRow value={timer.value} tone="danger" time={timer.time} />
			<div className="flex flex-col items-start gap-4">
				<LabelText>Tanpa petunjuk. Ketik wilayahnya.</LabelText>
				<PlateTile code="BM" size="lg" emphasize="code" />
			</div>
			<Input placeholder="Ketik jawaban…" />
			<Button block kbd="Enter" iconRight={<CornerDownLeft className="size-4" aria-hidden />}>
				Periksa
			</Button>
			<p className="text-body-sm text-ink-500 leading-[1.4]">
				Batas 8 detik. Lewat batas, soal ditutup dengan{" "}
				<span className="font-mono">Waktu habis</span>.
			</p>
		</SessionShell>
	);
}
