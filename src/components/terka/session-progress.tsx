import { cn } from "@/lib/utils";

export function SessionProgress({
	current,
	total,
	className
}: {
	current: number;
	total: number;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<div className="flex flex-1 gap-0.75" aria-hidden>
				{Array.from({ length: total }, (_, i) => (
					<span
						key={i}
						className={cn(
							"h-1.5 flex-1 rounded-xs",
							i < current ? "bg-ink-1000" : "bg-ink-100"
						)}
					/>
				))}
			</div>
			<span className="shrink-0 font-mono text-body-sm font-medium text-ink-500 tabular-nums">
				{current}/{total}
			</span>
		</div>
	);
}
