import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const fillVariants = cva(
	"h-full rounded-xs transition-[width] duration-260 ease-out motion-reduce:transition-none",
	{
		variants: {
			tone: {
				ink: "bg-ink-1000",
				success: "bg-go-500",
				danger: "bg-stop-500",
				warn: "bg-caution-500",
				brand: "bg-caution-500"
			}
		},
		defaultVariants: { tone: "ink" }
	}
);

export function ProgressBar({
	value,
	tone,
	marker,
	className
}: VariantProps<typeof fillVariants> & { value: number; marker?: number; className?: string }) {
	return (
		<div
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={100}
			className={cn("relative h-1.5 w-full overflow-hidden rounded-xs bg-ink-100", className)}
		>
			<div className={fillVariants({ tone })} style={{ width: `${value}%` }} />
			{marker !== undefined ? (
				<div
					className="absolute top-0 h-full w-px bg-ink-1000"
					style={{ left: `${marker}%` }}
					aria-hidden
				/>
			) : null}
		</div>
	);
}
