import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputVariants } from "./input";

export function Select({ className, ...props }: React.ComponentProps<"select">) {
	return (
		<div className={cn("relative", className)}>
			<select
				className={cn(inputVariants({ size: "md" }), "appearance-none pr-10")}
				{...props}
			/>
			<ChevronDown
				className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-700"
				aria-hidden
			/>
		</div>
	);
}
