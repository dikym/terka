import { Check, CornerDownLeft, Medal } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PlateTile } from "@/components/terka/plate-tile";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const plate = { code: "DK", number: "1234", suffix: "ABC" };
const stepOne = { label: "Langkah 1 — Bali", time: "2,0 s" };

export function PlatUtuh() {
	return (
		<SessionShell
			current={4}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-caution-100 text-ink-1000">Plat utuh</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>langkah 2 dari 2 — kabupaten mana?</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="suffix"
				/>
			</div>
			<div className="border-go-500 bg-go-100 flex items-center gap-3 rounded-sm border p-3">
				<Check className="size-4 shrink-0" aria-hidden />
				<span className="text-body-md text-ink-1000 leading-[1.3]">{stepOne.label}</span>
				<span className="text-micro text-ink-500 ml-auto font-mono">{stepOne.time}</span>
			</div>
			<Input placeholder="Ketik jawaban…" />
			<Button block kbd="Enter" iconRight={<CornerDownLeft className="size-4" aria-hidden />}>
				Periksa
			</Button>
			<Callout tone="sky" title="Pola sufiks">
				Sufiks <span className="font-mono">A**</span> untuk Denpasar. Angka dan sufiks
				disusun generator, jadi soalnya tidak pernah identik.
			</Callout>
		</SessionShell>
	);
}
