import { ArrowRight, Undo2 } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { LabelText } from "@/components/ui/label-text";

const restored = {
	code: "AD · kode",
	after: "wilayah",
	schedule: "diulang lagi dalam 48 hari",
	status: "Dikuasai"
};

export function JawabanDibatalkan() {
	return (
		<SessionShell current={8} total={24}>
			<div className="bg-ink-1000 shadow-block-accent flex items-center justify-between gap-3 rounded-sm px-4 py-3">
				<span className="flex items-center gap-2">
					<Undo2 className="text-paper-25 size-4" aria-hidden />
					<span className="font-display text-body-md text-paper-25 font-semibold">
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
							<span className="text-body-md text-ink-1000 inline-flex items-center gap-1 font-mono">
								{restored.code}
								<ArrowRight className="size-[0.9em]" aria-hidden />
								{restored.after}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3">
							<LabelText>jadwal</LabelText>
							<span className="text-body-sm text-ink-900 font-mono font-medium">
								{restored.schedule}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3">
							<LabelText>status</LabelText>
							<span className="text-body-sm text-ink-900 font-mono font-medium">
								{restored.status}
							</span>
						</div>
					</div>
				</div>
			</Card>
			<Callout title="Satu langkah saja">
				Undo hanya mengembalikan jawaban paling akhir. Jawaban sebelumnya tidak bisa
				dibatalkan lagi.
			</Callout>
			<Button block iconRight={<ArrowRight className="size-4" aria-hidden />}>
				Lanjut
			</Button>
		</SessionShell>
	);
}
