import { cn } from "@/lib/utils";

export function Wordmark({ compact, className }: { compact?: boolean; className?: string }) {
	if (compact) {
		return (
			<span
				className={cn(
					"border-ink-1000 bg-paper-0 font-plate text-ink-1000 inline-flex items-center gap-[0.3em] rounded-sm border-2 px-[9px] py-1 text-[19px] leading-none font-bold tracking-[0.05em]",
					className
				)}
				aria-label="terka"
			>
				T<span>3</span>
				<span>RKA</span>
			</span>
		);
	}
	return (
		<span
			className={cn(
				"font-display text-title tracking-wordmark text-ink-1000 font-bold",
				className
			)}
		>
			terka<span className="text-caution-700">.</span>
		</span>
	);
}
