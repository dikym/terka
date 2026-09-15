import { Brain, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionShell } from "@/components/layout/session-shell";
import { LabelText } from "@/components/ui/label-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlateTile } from "@/components/terka/plate-tile";

const plate = { code: "DA", number: "4821", suffix: "LK" };

export function LevelChip({
	level,
	label,
	filled,
	icon: Icon = Brain
}: {
	level: number;
	label: string;
	filled: number;
	icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
	return (
		<span
			role="img"
			aria-label={`Level ${level} · ${label}`}
			title={`Level ${level} · ${label}`}
			className="inline-flex shrink-0 items-center gap-2"
		>
			<span className="inline-flex gap-[3px]">
				{[0, 1, 2].map((i) => (
					<span
						key={i}
						className={cn(
							"size-[6px] shrink-0 rounded-[1px]",
							i < filled ? "bg-ink-1000" : "bg-ink-200"
						)}
					/>
				))}
			</span>
			<Icon className="text-ink-700 size-4" aria-hidden />
		</span>
	);
}

export function SesiTanya() {
	return (
		<SessionShell
			current={7}
			total={24}
			toolbar={<LevelChip level={2} label="Ingat" filled={2} />}
		>
			<div className="flex flex-col items-start gap-4">
				<LabelText>Dari mana plat ini?</LabelText>
				<PlateTile
					code={plate.code}
					number={plate.number}
					suffix={plate.suffix}
					emphasize="code"
				/>
			</div>
			<Input placeholder="Ketik jawaban…" />
			<Button block kbd="Enter" iconRight={<CornerDownLeft className="size-4" aria-hidden />}>
				Periksa
			</Button>
			<Button variant="ghost" size="sm">
				Turunkan ke Level 1 · tidak memengaruhi jadwal
			</Button>
		</SessionShell>
	);
}
