"use client";
import { useSessionView } from "@/components/learning/session-view";
import { ModeBadge } from "@/components/terka/mode-badge";
import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { codeChipVariants } from "@/components/terka/code-chip";
import { LevelChip } from "@/components/terka/level-chip";

const previewQuestion = {
	heading: "Mana yang Bengkulu?",
	description: "BE dan BD sering tertukar. Bedakan keduanya.",
	options: ["BD", "BE"]
};

export function Bandingkan() {
	const view = useSessionView();
	const question = view?.question
		? {
				heading: view.question.prompt,
				description: view.question.context.join(" "),
				options: view.question.choices
			}
		: previewQuestion;

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
				{question.options.map((code) => (
					<button
						key={code}
						disabled={view?.busy}
						onClick={() => view?.submit([code])}
						type="button"
						className={cn(codeChipVariants({}), "hover:bg-paper-50")}
					>
						{code}
					</button>
				))}
			</div>
		</SessionShell>
	);
}
