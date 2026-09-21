import { cn } from "@/lib/utils";

export function Tag({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-xs border border-ink-200 bg-paper-0 px-2 py-0.5 font-mono text-body-sm font-medium text-ink-900",
				className
			)}
			{...props}
		/>
	);
}
