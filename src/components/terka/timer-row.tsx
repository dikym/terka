import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

export function TimerRow({
	value,
	tone,
	time,
	className
}: {
	value: number;
	tone: "danger" | "success";
	time: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<Clock className="size-4 shrink-0" aria-hidden />
			<ProgressBar value={value} tone={tone} className="rounded-xs" />
			<span className="shrink-0 font-mono text-body-lg leading-none font-bold text-ink-1000 tabular-nums">
				{time}
			</span>
		</div>
	);
}
