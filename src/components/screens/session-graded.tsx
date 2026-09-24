"use client";
import { useSessionView } from "@/components/learning/session-view";
import { dateLabel } from "@/lib/terka/practice";
import { CornerDownLeft } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Button } from "@/components/ui/button";
import { PlateTile } from "@/components/terka/plate-tile";
import { FactCard } from "@/components/terka/fact-card";
import { VerdictLine } from "@/components/terka/verdict-line";
import { LevelChip } from "@/components/terka/level-chip";
import { GradedAnswer } from "@/components/terka/graded-answer";

const previewPlate = { code: "DA", number: "4821", suffix: "LK" };

const previewAnswer = {
	value: "Kalimantan Selatan",
	alias: "Alias diterima: Kalsel, Banjarmasin"
};

const previewFact = {
	source: "Handboek voor automobilisten, Java Motor Club, 1920",
	body: "Wilayah Zuider en Ooster Afdeeling van Borneo memakai satu kode tunggal, DA. Kalimantan Selatan adalah wilayah pertama di Kalimantan yang memakai pelat nomor."
};

export function SessionGradedScreen() {
	const view = useSessionView();
	const plate = view?.plate ?? previewPlate;
	const question = view?.question;
	const review = view?.review;
	const answer = view
		? {
				value: question?.targets.map((target) => target.name).join(" · ") ?? "",
				alias: `Jawaban Anda: ${review?.answers.join(", ") || "Tidak dijawab"}`
			}
		: previewAnswer;
	const region = view?.content.regions.find((region) => region.id === question?.regionId);
	const storedFact = view?.content.facts.find(
		(fact) => fact.publicationStatus === "ready" && region?.facts.includes(fact.id)
	);
	const fact = view
		? storedFact
			? { source: storedFact.source, body: storedFact.text }
			: null
		: previewFact;
	const card = view?.progress.cards.find((card) => card.cardId === question?.cardId);

	return (
		<SessionShell
			current={7}
			total={24}
			toolbar={<LevelChip level={question?.level ?? 2} filled={question?.level ?? 2} />}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>{question?.prompt ?? "Dari mana plat ini?"}</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="code"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<GradedAnswer>{answer.value}</GradedAnswer>
				<span className="text-body-sm text-ink-500">{answer.alias}</span>
			</div>
			{fact && (
				<FactCard
					confidence={storedFact?.historyLabel ?? "terverifikasi"}
					source={fact.source}
				>
					{fact.body}
				</FactCard>
			)}
			<VerdictLine
				verdict={
					review
						? review.correct
							? review.fuzzy
								? "near"
								: "right"
							: "wrong"
						: "right"
				}
				label={
					review
						? review.timedOut
							? "Waktu habis"
							: review.correct
								? "Benar"
								: "Belum tepat"
						: "Benar"
				}
				detail={
					view
						? review?.scheduled && card
							? `Diulang: ${dateLabel(card.due)}`
							: "Jadwal tidak berubah"
						: "diulang lagi dalam 30 jam"
				}
			/>
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
