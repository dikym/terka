import { Eye } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";
import { TimerRow } from "./tanpa-petunjuk";

const timer = { value: 60, time: "1,2 s" };

export function BenarSalah() {
	return (
		<SessionShell
			current={2}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-stop-100 text-ink-1000">Benar/salah kilat</ModeBadge>
					<LevelChip level={1} label="Kenali" filled={1} icon={Eye} />
				</span>
			}
		>
			<TimerRow value={timer.value} tone="success" time={timer.time} />
			<h2 className="font-display text-title text-ink-1000 font-bold">BE = Bengkulu?</h2>
			<div className="grid grid-cols-2 gap-3">
				<Button variant="confirm" size="lg" kbd="F">
					Benar
				</Button>
				<Button variant="stop" size="lg" kbd="J">
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
