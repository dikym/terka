import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ModeBadge({
	className,
	children
}: React.PropsWithChildren<{ className?: string }>) {
	return (
		<Badge dot className={cn("w-fit shrink-0 self-start whitespace-nowrap", className)}>
			{children}
		</Badge>
	);
}
