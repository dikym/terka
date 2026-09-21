import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
			<Badge dot className={cn("self-start", verdictClass[verdict])}>
				{label}
			</Badge>
			{detail ? <span className="font-mono text-body-sm text-ink-500">{detail}</span> : null}
		</div>
	);
}
