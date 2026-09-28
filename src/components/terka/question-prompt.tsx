"use client";
import { useSessionView } from "@/components/learning/session-view";
import { islandGroup } from "@/components/learning/presentation";
import { CodeBadge } from "./code-badge";
import { PlateTile } from "./plate-tile";

export function QuestionPrompt() {
	const view = useSessionView();
	if (!view?.question)
		return <h1 className="font-display text-heading font-semibold">Pratinjau soal</h1>;
	const { question, plate, content } = view;
	const region = content.regions.find((region) => region.id === question.regionId);
	return (
		<div className="flex flex-col gap-4">
			<h1 className="font-display text-heading font-semibold">{question.prompt}</h1>
			{question.context.length ? (
				<p className="text-body-sm text-ink-500">{question.context.join(" · ")}</p>
			) : null}
			{question.answerKind !== "code" ? (
				<div className="flex justify-center py-4">
					{plate.number ? (
						<PlateTile {...plate} emphasize="code" />
					) : (
						<CodeBadge
							code={plate.code}
							group={islandGroup(region?.group ?? "")}
							size="lg"
						/>
					)}
				</div>
			) : null}
		</div>
	);
}
