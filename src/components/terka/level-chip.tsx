import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function LevelChip({
	level,
	label,
	filled,
	icon: Icon = Brain
}: {
	level: number;
	label?: string;
	filled: number;
	icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> | null;
}) {
	const ariaLabel = label ? `Level ${level} · ${label}` : `Level ${level}`;
	return (
		<span
			role="img"
			aria-label={ariaLabel}
			title={ariaLabel}
			className="inline-flex shrink-0 items-center gap-2"
		>
			<span className="inline-flex gap-0.75">
				{[0, 1, 2].map((i) => (
					<span
						key={i}
						className={cn(
							"size-1.5 shrink-0 rounded-[1px]",
							i < filled ? "bg-ink-1000" : "bg-ink-200"
						)}
					/>
				))}
			</span>
			{Icon ? <Icon className="size-4 text-ink-700" aria-hidden /> : null}
		</span>
	);
}
