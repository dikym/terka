import { cn } from "@/lib/utils";

export function TwoColumn({
	aside,
	className,
	children
}: {
	aside: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("grid grid-cols-[minmax(0,1fr)_var(--spacing-panel)] gap-8", className)}>
			<div className="flex min-w-0 flex-col gap-5">{children}</div>
			<aside className="sticky top-8 flex flex-col gap-4 self-start">{aside}</aside>
		</div>
	);
}
