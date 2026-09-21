import { ArrowRight } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { FactCard } from "@/components/terka/fact-card";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";
import { GradedAnswer } from "@/components/terka/graded-answer";

const question =
	"Provinsi yang dulunya berkode DS, lalu menggantinya pada 1 Juli 2016 bertepatan dengan HUT Bhayangkara.";

const fact = {
	source: "Korlantas Polri",
	body: "Dalam sebelas tahun, satu kode tunggal DS berkembang menjadi lima kode terpisah: PA, PB, PY, PS, dan PT."
};

export function FaktaKode() {
	return (
		<SessionShell
			current={13}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-caution-100 text-ink-1000">
						Fakta{" "}
						<ArrowRight
							className="inline-block size-[0.9em] align-[-0.09em]"
							aria-hidden
						/>{" "}
						Kode
					</ModeBadge>
					<LevelChip level={2} label="Ingat" filled={2} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-3">
				<LabelText>kode mana yang dimaksud?</LabelText>
				<p className="text-body-lg leading-loose text-ink-900">{question}</p>
			</div>
			<GradedAnswer className="font-mono font-semibold tracking-plate uppercase">
				PA
			</GradedAnswer>
			<span className="text-body-sm leading-[1.4] text-ink-500">
				Jawaban berupa kode dinilai persis — tanpa toleransi salah ketik.
			</span>
			<FactCard confidence="terverifikasi" source={fact.source}>
				{fact.body}
			</FactCard>
		</SessionShell>
	);
}
