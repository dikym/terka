import { cn } from "@/lib/utils";

export function GradedAnswer({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex h-control w-full items-center rounded-sm border-2 border-go-500 bg-go-100 px-4 text-body-lg text-ink-1000",
				className
			)}
			{...props}
		/>
	);
}
