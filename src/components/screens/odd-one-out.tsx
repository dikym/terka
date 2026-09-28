"use client";
import { useSessionView } from "@/components/learning/session-view";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { Callout } from "@/components/ui/callout";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";

const previewOptions = [
	{ name: "Medan" },
	{ name: "Binjai" },
	{ name: "Pematang Siantar" },
	{ name: "Bukittinggi", tag: "BA", emphasized: true }
];

export function OddOneOutScreen() {
	const view = useSessionView();
	const options: { name: string; tag?: string; emphasized?: boolean }[] = view?.question
		? view.question.choices.map((name) => ({ name }))
		: previewOptions;

	return (
		<SessionShell
			current={6}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-stop-100 text-ink-1000">
						{view?.intro
							? "Materi baru · tebak dulu"
							: view?.question?.format !== "choice"
								? "Mana yang bukan"
								: view.question.answerKind === "code"
									? "Tebak kode"
									: "Tebak daerah"}
					</ModeBadge>
					<LevelChip level={1} label="Kenali" filled={1} icon={Eye} />
				</span>
			}
		>
			<h2 className="font-display text-title font-bold text-ink-1000">
				{view?.question?.prompt ?? (
					<>
						Mana yang{" "}
						<span className="underline decoration-2 underline-offset-3">BUKAN</span>{" "}
						wilayah BK?
					</>
				)}
			</h2>
			<div className="flex flex-col gap-2">
				{options.map((option) => (
					<button
						key={option.name}
						disabled={view?.busy}
						onClick={() => view?.submit([option.name])}
						type="button"
						className={cn(
							"flex min-h-11 w-full items-center gap-3 rounded-sm border bg-paper-0 px-4 py-3 text-left transition-[border-color,box-shadow] duration-90 ease-out hover:border-ink-1000 hover:shadow-block",
							option.emphasized ? "border-ink-1000 shadow-block" : "border-ink-200"
						)}
					>
						<span className="flex-1 text-body-lg leading-[1.3] text-ink-1000">
							{option.name}
						</span>
						{option.tag ? (
							<span className="font-mono text-micro text-ink-500">{option.tag}</span>
						) : null}
					</button>
				))}
			</div>
			<Callout tone="sky" title="Pengecoh level 1">
				Pengecoh diambil dari kawasan lain, jadi mudah dieliminasi. Level 3 memakai pengecoh
				dari daftar kode yang sering tertukar dengan kartu ini sendiri.
			</Callout>
		</SessionShell>
	);
}
