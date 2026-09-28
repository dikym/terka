import { cn } from "@/lib/utils";

const verdictClass = {
	right: "border-go-500 bg-go-100",
	near: "border-caution-500 bg-caution-100",
	wrong: "border-stop-500 bg-stop-100"
} as const;

export function GradedAnswer({
	verdict = "right",
	className,
	...props
}: React.ComponentProps<"div"> & { verdict?: keyof typeof verdictClass }) {
	return (
		<div
			className={cn(
				"flex h-control w-full items-center rounded-sm border-2 px-4 text-body-lg text-ink-1000",
				verdictClass[verdict],
				className
			)}
			{...props}
		/>
	);
}
