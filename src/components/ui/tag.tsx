import { cn } from "@/lib/utils";

export function Tag({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"border-ink-200 bg-paper-0 text-body-sm text-ink-900 inline-flex items-center rounded-xs border px-2 py-0.5 font-mono font-medium",
				className
			)}
			{...props}
		/>
	);
}
