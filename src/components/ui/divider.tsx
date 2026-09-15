import { cn } from "@/lib/utils";

export function Divider({
	className,
	strong,
	...props
}: React.ComponentProps<"hr"> & { strong?: boolean }) {
	return (
		<hr
			className={cn("h-px w-full border-0", strong ? "bg-ink-300" : "bg-ink-200", className)}
			{...props}
		/>
	);
}
