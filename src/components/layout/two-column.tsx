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
		<div
			className={cn(
				"grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_var(--spacing-panel)]",
				className
			)}
		>
			<div className="flex min-w-0 flex-col gap-5">{children}</div>
			<aside className="flex min-w-0 flex-col gap-4 self-start lg:sticky lg:top-8">
				{aside}
			</aside>
		</div>
	);
}
