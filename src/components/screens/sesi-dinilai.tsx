import { CornerDownLeft } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Button } from "@/components/ui/button";
import { PlateTile } from "@/components/terka/plate-tile";
import { FactCard } from "@/components/terka/fact-card";
import { VerdictLine } from "@/components/terka/verdict-line";
import { LevelChip } from "./sesi-tanya";

const plate = { code: "DA", number: "4821", suffix: "LK" };

const answer = {
	value: "Kalimantan Selatan",
	alias: "Alias diterima: Kalsel, Banjarmasin"
};

const fact = {
	source: "Handboek voor automobilisten, Java Motor Club, 1920",
	body: "Wilayah Zuider en Ooster Afdeeling van Borneo memakai satu kode tunggal, DA. Kalimantan Selatan adalah wilayah pertama di Kalimantan yang memakai pelat nomor."
};

export function SesiDinilai() {
	return (
		<SessionShell
			current={7}
			total={24}
			toolbar={<LevelChip level={2} label="Ingat" filled={2} />}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>Dari mana plat ini?</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="code"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<div className="border-go-500 bg-go-100 text-ink-1000 h-control text-body-lg flex w-full items-center rounded-sm border-2 px-4">
					{answer.value}
				</div>
				<span className="text-body-sm text-ink-500">{answer.alias}</span>
			</div>
			<FactCard confidence="terverifikasi" source={fact.source}>
				{fact.body}
			</FactCard>
			<VerdictLine verdict="right" label="Benar" detail="diulang lagi dalam 30 jam" />
			<Button block kbd="Enter" iconRight={<CornerDownLeft className="size-4" aria-hidden />}>
				Lanjut
			</Button>
		</SessionShell>
	);
}
