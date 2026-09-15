import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const plateVariants = cva(
	"inline-flex items-baseline gap-[0.35em] rounded-sm border-2 border-plate-ink bg-plate-ground font-plate font-bold tracking-plate text-plate-ink",
	{
		variants: {
			size: {
				sm: "px-3 py-1.5 text-heading",
				md: "px-[18px] py-2.5 text-display",
				lg: "px-6 py-3 text-hero"
			}
		},
		defaultVariants: { size: "md" }
	}
);

export function PlateTile({
	code,
	number,
	suffix,
	muted,
	emphasize,
	size,
	className
}: VariantProps<typeof plateVariants> & {
	code: string;
	number?: string;
	suffix?: string;
	muted?: boolean;
	emphasize?: "code" | "number" | "suffix";
	className?: string;
}) {
	return (
		<div
			className={cn(plateVariants({ size }), className)}
			aria-label={[code, number, suffix].filter(Boolean).join(" ")}
		>
			<span className={cn(emphasize === "code" && "text-caution-700")}>{code}</span>
			{number ? (
				<span
					className={cn(
						muted && "text-ink-300",
						emphasize === "number" && "text-caution-700"
					)}
				>
					{number}
				</span>
			) : null}
			{suffix ? (
				<span
					className={cn(
						muted && "text-ink-300",
						emphasize === "suffix" && "text-caution-700"
					)}
				>
					{suffix}
				</span>
			) : null}
		</div>
	);
}
