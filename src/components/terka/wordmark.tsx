import { cn } from "@/lib/utils";

export function Wordmark({ compact, className }: { compact?: boolean; className?: string }) {
	if (compact) {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-[0.3em] rounded-sm border-2 border-ink-1000 bg-paper-0 px-2.25 py-1 font-plate text-[19px] leading-none font-bold tracking-[0.05em] text-ink-1000",
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
				"font-display text-title font-bold tracking-wordmark text-ink-1000",
				className
			)}
		>
			terka<span className="text-caution-700">.</span>
		</span>
	);
}
