import { cn } from "@/lib/utils";

export function Switch({
	checked,
	label,
	className,
	onClick,
	disabled
}: {
	checked: boolean;
	label: string;
	className?: string;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			role="switch"
			aria-checked={checked}
			aria-label={label}
			className={cn(
				"flex h-7 w-11.5 shrink-0 items-center rounded-pill border border-ink-300 p-0.75 transition-colors duration-90 ease-out",
				checked ? "justify-end bg-go-500" : "justify-start bg-paper-50",
				className,
				onClick,
				disabled
			)}
		>
			<span
				className={cn("block size-5 rounded-full", checked ? "bg-paper-0" : "bg-ink-1000")}
			/>
		</button>
	);
}
