import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"rounded-xs border border-current px-1.25 py-0.75 font-mono text-micro font-medium opacity-55",
				className
			)}
			{...props}
		/>
	);
}
