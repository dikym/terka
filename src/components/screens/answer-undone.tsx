"use client";
import { useSessionView } from "@/components/learning/session-view";
import { dateLabel } from "@/lib/terka/practice";
import { cardStateLabels } from "@/components/terka/card-state-badge";
import { ArrowRight, Undo2 } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { LabelText } from "@/components/ui/label-text";

const previewRestored = {
	code: "AD · kode",
	after: "wilayah",
	schedule: "diulang lagi dalam 48 hari",
	status: "Dikuasai"
};

export function AnswerUndoneScreen() {
	const view = useSessionView();
	const card = view?.progress.cards.find((card) => card.cardId === view.question?.cardId);
	const restored = view
		? {
				code: `${view.content.regions.find((region) => region.id === card?.regionId)?.code ?? ""} · kode`,
				after: card?.mode === "region2code" ? "kode" : "wilayah",
				schedule: card ? dateLabel(card.due) : "—",
				status: card ? cardStateLabels[card.state] : "—"
			}
		: previewRestored;

	return (
		<SessionShell current={8} total={24}>
			<div className="flex items-center justify-between gap-3 rounded-sm bg-ink-1000 px-4 py-3 shadow-block-accent">
				<span className="flex items-center gap-2">
					<Undo2 className="size-4 text-paper-25" aria-hidden />
					<span className="font-display text-body-md font-semibold text-paper-25">
						Jawaban dibatalkan
					</span>
				</span>
				<Kbd className="text-paper-25 opacity-100">Z</Kbd>
			</div>
			<Card accent="danger">
				<div className="p-4">
					<header className="mb-3">
						<CardTitle>Dipulihkan</CardTitle>
					</header>
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-3">
							<span className="inline-flex items-center gap-1 font-mono text-body-md text-ink-1000">
								{restored.code}
								<ArrowRight className="size-[0.9em]" aria-hidden />
								{restored.after}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3">
							<LabelText>jadwal</LabelText>
							<span className="font-mono text-body-sm font-medium text-ink-900">
								{restored.schedule}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3">
							<LabelText>status</LabelText>
							<span className="font-mono text-body-sm font-medium text-ink-900">
								{restored.status}
							</span>
						</div>
					</div>
				</div>
			</Card>
			<Callout title="Satu langkah saja">
				Jawaban terakhir selalu bisa dibatalkan sampai jawaban berikutnya masuk. Setiap
				kartu menyimpan satu salinan keadaan sebelumnya.
			</Callout>
			<Button disabled={view?.busy} onClick={view?.next} variant="secondary" block>
				Jawab ulang kartu ini
			</Button>
		</SessionShell>
	);
}
