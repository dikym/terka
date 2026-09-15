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
			<div className="flex flex-1 gap-[3px]" aria-hidden>
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
			<span className="text-body-sm text-ink-500 shrink-0 font-mono font-medium tabular-nums">
				{current}/{total}
			</span>
		</div>
	);
}
