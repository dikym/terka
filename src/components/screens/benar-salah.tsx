"use client";
import { useSessionView } from "@/components/learning/session-view";
import { Eye } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";
import { TimerRow } from "@/components/terka/timer-row";

const previewTimer = { value: 60, time: "1,2 s" };

export function BenarSalah() {
	const view = useSessionView();
	const timer = view?.timer ?? previewTimer;
	return (
		<SessionShell
			current={2}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-stop-100 text-ink-1000">Benar/salah kilat</ModeBadge>
					<LevelChip level={1} label="Kenali" filled={1} icon={Eye} />
				</span>
			}
		>
			<TimerRow value={timer.value} tone="success" time={timer.time} />
			<h2 className="font-display text-title font-bold text-ink-1000">
				{view?.question?.prompt ?? "BE = Bengkulu?"}
			</h2>
			<div className="grid grid-cols-2 gap-3">
				<Button
					disabled={view?.busy}
					onClick={() => view?.submit(["Benar"])}
					variant="confirm"
					size="lg"
					kbd="F"
				>
					Benar
				</Button>
				<Button
					disabled={view?.busy}
					onClick={() => view?.submit(["Salah"])}
					variant="stop"
					size="lg"
					kbd="J"
				>
					Salah
				</Button>
			</div>
			<Callout title="Catatan">
				Batas 2 detik. Jawaban di bentuk ini tidak mengubah jadwal; hanya akurasi dan kode
				yang sering tertukar yang dicatat.
			</Callout>
		</SessionShell>
	);
}
