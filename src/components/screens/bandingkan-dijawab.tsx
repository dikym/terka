import { CornerDownLeft, Medal } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { LabelText } from "@/components/ui/label-text";
import { chipVariants } from "@/components/terka/code-chip";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const question = {
	heading: "Mana yang Bengkulu?",
	sub: "BE dan BD sering tertukar. Bedakan keduanya.",
	options: [
		{ code: "BD", tone: "wrong" as const },
		{ code: "BE", tone: "right" as const }
	]
};

const distinction =
	"BD Kabupaten Dharmasraya, Sumatera Barat. BE Bengkulu — huruf E seperti Enggano, pulau di lepas pantai Bengkulu.";

export function BandingkanDijawab() {
	return (
		<SessionShell
			current={9}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge tone="bg-grape-100 text-state-leech">Bandingkan Kode</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<h2 className="font-display text-title text-ink-1000 font-bold">{question.heading}</h2>
			<p className="text-body-md text-ink-900">{question.sub}</p>
			<div className="grid grid-cols-2 gap-3">
				{question.options.map(({ code, tone }) => (
					<button key={code} type="button" className={chipVariants({ tone })}>
						{code}
					</button>
				))}
			</div>
			<div className="border-ink-200 text-ink-1000 flex flex-col gap-2 rounded-md border bg-sky-100 p-4">
				<LabelText className="text-sky-700">Ciri pembeda</LabelText>
				<p className="text-body-md text-ink-1000">{distinction}</p>
			</div>
			<Button block kbd="Enter" iconRight={<CornerDownLeft className="size-4" aria-hidden />}>
				Lanjut
			</Button>
		</SessionShell>
	);
}
