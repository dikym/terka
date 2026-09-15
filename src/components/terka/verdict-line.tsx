import { cn } from "@/lib/utils";

const verdictClass = {
	right: "bg-go-100 text-go-700",
	near: "bg-caution-100 text-caution-700",
	wrong: "bg-stop-100 text-stop-700"
} as const;

export function VerdictLine({
	verdict,
	label,
	detail,
	className
}: {
	verdict: keyof typeof verdictClass;
	label: React.ReactNode;
	detail?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-between gap-3", className)}>
			<span
				className={cn(
					"rounded-pill font-display text-label inline-flex items-center gap-2 self-start px-2.5 py-1 font-semibold uppercase",
					verdictClass[verdict]
				)}
			>
				<span className="size-[7px] shrink-0 rounded-full bg-current" aria-hidden />
				{label}
			</span>
			{detail ? <span className="text-body-sm text-ink-500 font-mono">{detail}</span> : null}
		</div>
	);
}
