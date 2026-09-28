"use client";
import { useSessionView } from "@/components/learning/session-view";
import { LevelChip } from "@/components/terka/level-chip";
import { CornerDownLeft } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlateTile } from "@/components/terka/plate-tile";
import { ANSWER_MAX_CHARS } from "@/rules";

const previewPlate = { code: "DA", number: "4821", suffix: "LK" };

export function SessionQuestionScreen() {
	const view = useSessionView();
	const plate = view?.plate ?? previewPlate;
	return (
		<SessionShell
			current={7}
			total={24}
			toolbar={
				<LevelChip level={view?.question?.level ?? 2} filled={view?.question?.level ?? 2} />
			}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>
					{view?.question
						? [view.question.prompt, ...view.question.context].join(" · ")
						: "Dari mana plat ini?"}
				</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="code"
				/>
			</div>
			<Input
				placeholder="Ketik jawaban…"
				aria-label="Ketik jawaban"
				value={view?.value}
				onChange={(event) => view?.setValue(event.target.value)}
				disabled={view?.busy}
				maxLength={ANSWER_MAX_CHARS}
				autoComplete="off"
			/>
			<Button
				disabled={view?.busy}
				onClick={() => view?.submit()}
				block
				kbd="Enter"
				iconRight={<CornerDownLeft className="size-4" aria-hidden />}
			>
				Periksa
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={view?.busy || (view?.question?.level ?? 2) <= 1}
				onClick={view?.lower}
			>
				{`Turunkan ke Level ${Math.max(1, (view?.question?.level ?? 2) - 1)} · tidak memengaruhi jadwal`}
			</Button>
		</SessionShell>
	);
}
