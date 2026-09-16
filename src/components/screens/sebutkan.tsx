import { Check, X } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const progress = { found: 3, threshold: 5, total: 12, percent: 60 };

const answers = [
	{ name: "Medan", correct: true },
	{ name: "Binjai", correct: true },
	{ name: "Deli Serdang", correct: true },
	{ name: "Padang", correct: false, note: "BA — dicatat sebagai tertukar" }
];

export function Sebutkan() {
	return (
		<SessionShell
			current={21}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-grape-100 text-ink-1000">
						Sebutkan sebanyak mungkin
					</ModeBadge>
					<LevelChip level={3} filled={3} icon={null} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-3">
				<LabelText>sebutkan wilayah kode ini</LabelText>
				<div className="flex items-center gap-3">
					<CodeBadge code="BK" group="sumatera" size="lg" />
					<span className="text-heading text-ink-1000 font-mono font-bold">
						{progress.found} / {progress.threshold}
					</span>
					<span className="text-body-sm text-ink-500 font-mono font-medium">
						ambang {progress.threshold} dari {progress.total}
					</span>
				</div>
			</div>
			<div className="bg-ink-100 h-2 overflow-hidden rounded-xs">
				<div
					className="bg-group-sumatera h-full"
					style={{ width: `${progress.percent}%` }}
				/>
			</div>
			<div className="flex flex-col gap-2">
				{answers.map((answer) => (
					<div
						key={answer.name}
						className={
							answer.correct
								? "border-go-500 bg-go-100 flex items-center gap-3 rounded-sm border p-3"
								: "border-stop-500 bg-stop-100 flex items-center gap-3 rounded-sm border p-3"
						}
					>
						{answer.correct ? (
							<Check className="size-4 shrink-0" aria-hidden />
						) : (
							<X className="size-4 shrink-0" aria-hidden />
						)}
						<span className="text-body-md text-ink-1000 flex-1 leading-[1.3]">
							{answer.name}
						</span>
						{answer.note ? (
							<span className="text-micro text-stop-700 font-mono">
								{answer.note}
							</span>
						) : null}
					</div>
				))}
			</div>
			<Input placeholder="Tambah jawaban…" />
			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" kbd="Enter">
					Tambah
				</Button>
				<Button>Selesai</Button>
			</div>
			<Callout title="Tanpa penalti">
				Urutan bebas, tanpa batas waktu. Berhenti kapan saja tanpa penalti — nilainya jumlah
				yang berhasil disebut, bukan rasio terhadap total.
			</Callout>
		</SessionShell>
	);
}
