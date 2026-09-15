import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"text-micro rounded-xs border border-current px-[5px] py-[3px] font-mono font-medium opacity-55",
				className
			)}
			{...props}
		/>
	);
}
