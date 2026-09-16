import { Flame, Medal, CornerDownLeft } from "lucide-react";
import { LabelText } from "@/components/ui/label-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody } from "@/components/ui/card";
import { CodeBadge } from "@/components/terka/code-badge";
import { LevelChip } from "./sesi-tanya";
import { ModeBadge } from "./bandingkan";

const progress = { current: 3, total: 5, filled: 3, segments: 5 };
const streak = 17;

export function TantanganHarian() {
	return (
		<div className="bg-paper-0 flex min-h-dvh flex-col">
			<header className="border-ink-200 bg-paper-0 flex items-center justify-between gap-8 border-b px-6 py-4">
				<span className="inline-flex shrink-0 items-center gap-4">
					<ModeBadge tone="bg-caution-100 text-ink-1000">Tantangan Harian</ModeBadge>
					<span className="text-ink-900 inline-flex items-center gap-1.5">
						<Flame className="text-tangerine-500 size-[18px] shrink-0" aria-hidden />
						<span className="text-subhead font-mono leading-none font-bold">
							{streak}
						</span>
						<LabelText>Hari Beruntun</LabelText>
					</span>
				</span>
				<span className="flex min-w-0 flex-1 gap-[3px]">
					{Array.from({ length: progress.segments }, (_, i) => (
						<span
							key={i}
							className={
								i < progress.filled
									? "bg-caution-500 h-2.5 flex-1 rounded-xs"
									: "bg-ink-100 h-2.5 flex-1 rounded-xs"
							}
						/>
					))}
				</span>
				<span className="inline-flex shrink-0 items-baseline gap-2">
					<span className="text-subhead text-ink-1000 font-mono leading-none font-bold tabular-nums">
						{progress.current}
					</span>
					<span className="text-body-sm text-ink-500 font-mono leading-none font-medium">
						dari {progress.total}
					</span>
					<LabelText>soal terjawab</LabelText>
				</span>
			</header>
			<div className="flex flex-1 justify-center px-8 py-10">
				<div className="flex w-full max-w-[720px] flex-col gap-5">
					<Card accent="balinusra">
						<CardBody>
							<div className="flex items-center justify-between gap-3">
								<span className="text-body-md text-ink-900 leading-[1.3]">
									Soal 4
								</span>
								<LevelChip level={3} label="Kuasai" filled={3} icon={Medal} />
							</div>
							<div className="flex items-center gap-3">
								<CodeBadge
									code="DR"
									group="balinusra"
									className="text-subhead h-10 min-w-10"
								/>
								<span className="text-body-sm text-ink-500 font-mono font-medium">
									Tanpa Petunjuk
								</span>
							</div>
						</CardBody>
					</Card>
					<Button
						block
						kbd="Enter"
						iconRight={<CornerDownLeft className="size-4" aria-hidden />}
					>
						Lanjut
					</Button>
					<Callout title="Jadwal tidak berubah" titleClassName="text-warn-700">
						Soal diambil dari seluruh kartu yang pernah dipelajari, tanpa memandang
						Cakupan. Jawaban di sini tidak mengubah jadwal.
					</Callout>
					<div className="flex items-center justify-between gap-2">
						<LabelText>Jatah toleransi</LabelText>
						<span className="text-body-sm text-ink-500 font-mono font-medium">
							1 tersisa dalam 30 hari
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
