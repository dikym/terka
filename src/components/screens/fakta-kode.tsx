import { ArrowRight } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { FactCard } from "@/components/terka/fact-card";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";
import { GradedAnswer } from "./kode-belakang";

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
					<ModeBadge tone="bg-caution-100 text-ink-1000">
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
				<p className="text-body-lg text-ink-900 leading-loose">{question}</p>
			</div>
			<GradedAnswer className="tracking-plate font-mono font-semibold uppercase">
				PA
			</GradedAnswer>
			<span className="text-body-sm text-ink-500 leading-[1.4]">
				Jawaban berupa kode dinilai persis — tanpa toleransi salah ketik.
			</span>
			<FactCard confidence="terverifikasi" source={fact.source}>
				{fact.body}
			</FactCard>
		</SessionShell>
	);
}
