"use client";
import { useSessionView } from "@/components/learning/session-view";
import { CornerDownLeft, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { LabelText } from "@/components/ui/label-text";
import { codeChipVariants } from "@/components/terka/code-chip";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";

const previewQuestion = {
	heading: "Mana yang Bengkulu?",
	description: "BE dan BD sering tertukar. Bedakan keduanya.",
	options: [
		{ code: "BD", tone: "wrong" as const },
		{ code: "BE", tone: "right" as const }
	]
};

const previewDistinction =
	"BD Kabupaten Dharmasraya, Sumatera Barat. BE Bengkulu — huruf E seperti Enggano, pulau di lepas pantai Bengkulu.";

export function CompareAnsweredScreen() {
	const view = useSessionView();
	const question = view?.question
		? {
				heading: view.question.prompt,
				description: `Jawaban Anda: ${view.review?.answers.join(", ") || "Tidak dijawab"}`,
				options: view.question.choices.map((code) => ({
					code,
					tone:
						code === view.question?.targets[0].name
							? ("right" as const)
							: ("wrong" as const)
				}))
			}
		: previewQuestion;
	const distinction = view ? (view.question?.context.join(" ") ?? "") : previewDistinction;

	return (
		<SessionShell
			current={9}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-grape-100 text-state-leech">Bandingkan Kode</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<h2 className="font-display text-title font-bold text-ink-1000">{question.heading}</h2>
			<p className="text-body-md text-ink-900">{question.description}</p>
			<div className="grid grid-cols-2 gap-3">
				{question.options.map(({ code, tone }) => (
					<button
						key={code}
						type="button"
						className={cn(codeChipVariants({ tone }), "hover:bg-paper-50")}
					>
						{code}
					</button>
				))}
			</div>
			<div className="flex flex-col gap-2 rounded-md border border-ink-200 bg-sky-100 p-4 text-ink-1000">
				<LabelText className="text-sky-700">Ciri pembeda</LabelText>
				<p className="text-body-md text-ink-1000">{distinction}</p>
			</div>
			<Button
				disabled={view?.busy}
				onClick={view?.next}
				block
				kbd="Enter"
				iconRight={<CornerDownLeft className="size-4" aria-hidden />}
			>
				Lanjut
			</Button>
		</SessionShell>
	);
}
