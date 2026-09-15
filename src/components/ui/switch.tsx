import { cn } from "@/lib/utils";

export function Switch({
	checked,
	label,
	className
}: {
	checked: boolean;
	label: string;
	className?: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			className={cn(
				"rounded-pill border-ink-1000 relative h-6 w-11 shrink-0 border transition-colors duration-[90ms] ease-out",
				checked ? "bg-ink-1000" : "bg-ink-200",
				className
			)}
		>
			<span
				className={cn(
					"bg-paper-0 absolute top-0.5 left-0.5 size-[18px] rounded-xs transition-transform duration-[90ms] ease-out",
					checked && "translate-x-5"
				)}
			/>
		</button>
	);
}
