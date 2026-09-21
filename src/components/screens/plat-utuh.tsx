"use client";
import { useSessionView } from "@/components/learning/session-view";
import { Check, CornerDownLeft, Medal } from "lucide-react";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PlateTile } from "@/components/terka/plate-tile";
import { LevelChip } from "@/components/terka/level-chip";
import { ModeBadge } from "@/components/terka/mode-badge";

const previewPlate = { code: "DK", number: "1234", suffix: "ABC" };
const previewStepOne = { label: "Langkah 1 — Bali", time: "2,0 s" };

export function PlatUtuh() {
	const view = useSessionView();
	const plate = view?.plate ?? previewPlate;
	const stepOne = view
		? { label: `Langkah 1 — ${view.firstPart ?? "ketik wilayah"}`, time: "" }
		: previewStepOne;

	return (
		<SessionShell
			current={4}
			total={24}
			toolbar={
				<span className="inline-flex shrink-0 items-center gap-3">
					<ModeBadge className="bg-caution-100 text-ink-1000">Plat utuh</ModeBadge>
					<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
				</span>
			}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>
					{view && view.firstPart === null
						? "langkah 1 dari 2 — wilayah mana?"
						: "langkah 2 dari 2 — kabupaten mana?"}
				</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="suffix"
				/>
			</div>
			{(!view || view.firstPart !== null) && (
				<div className="flex items-center gap-3 rounded-sm border border-go-500 bg-go-100 p-3">
					<Check className="size-4 shrink-0" aria-hidden />
					<span className="text-body-md leading-[1.3] text-ink-1000">
						{stepOne.label}
					</span>
					<span className="ml-auto font-mono text-micro text-ink-500">
						{stepOne.time}
					</span>
				</div>
			)}
			<Input
				placeholder="Ketik jawaban…"
				aria-label="Ketik jawaban"
				value={view?.value}
				onChange={(event) => view?.setValue(event.target.value)}
				disabled={view?.busy}
				maxLength={500}
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
			<Callout tone="sky" title="Pola sufiks">
				{view ? (
					"Gunakan kode depan untuk wilayah dan huruf belakang untuk kabupaten/kota."
				) : (
					<>
						Sufiks <span className="font-mono">A**</span> untuk Denpasar. Angka dan
						sufiks disusun generator, jadi soalnya tidak pernah identik.
					</>
				)}
			</Callout>
		</SessionShell>
	);
}
