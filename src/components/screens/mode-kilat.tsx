import { Trophy } from "lucide-react";
import { LabelText } from "@/components/ui/label-text";
import { StatBlock } from "@/components/ui/stat-block";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const stats = { correct: 23, secondsLeft: 38, timeUsedPercent: 63 };
const options = ["Nusa Tenggara Timur", "Nusa Tenggara Barat", "Bali", "Maluku"];
const record = { region: "Kawasan Bali & Nusa Tenggara", best: 31 };

export function ModeKilat() {
	return (
		<div className="bg-paper-0 flex min-h-dvh flex-col">
			<header className="border-ink-200 bg-paper-0 flex items-center gap-5 border-b px-6 py-4">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span className="rounded-pill bg-paper-50 text-ink-1000 font-display text-label inline-flex w-fit items-center px-2.5 py-1 font-semibold uppercase">
							BALI &amp; NUSA TENGGARA
						</span>
						<span className="inline-flex shrink-0 items-center gap-3">
							<ModeBadge tone="bg-stop-100 text-ink-1000">Mode Kilat</ModeBadge>
							<LevelChip level={1} filled={1} icon={null} />
						</span>
					</div>
				</div>
			</header>
			<div className="flex flex-1 justify-center px-8 py-10">
				<div className="flex w-full max-w-[720px] flex-col gap-5">
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
						<LabelText>pilih wilayahnya</LabelText>
						<CodeBadge code="EB" group="balinusra" size="lg" />
					</div>
					<div className="grid grid-cols-2 gap-2">
						{options.map((label) => (
							<button
								key={label}
								type="button"
								className="border-ink-1000 shadow-block bg-paper-0 text-ink-1000 font-display text-body-sm min-h-control flex items-center justify-center rounded-sm border p-2 text-center leading-[1.25] font-semibold"
							>
								{label}
							</button>
						))}
					</div>
					<div className="border-ink-200 flex items-center justify-between gap-3 border-t pt-3">
						<span className="inline-flex items-center gap-2">
							<Trophy className="size-4 shrink-0" aria-hidden />
							<LabelText>Rekor terbaik di {record.region}</LabelText>
						</span>
						<span className="text-body-lg text-ink-1000 font-mono font-bold">
							{record.best}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
