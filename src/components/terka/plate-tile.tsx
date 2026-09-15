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
	size,
	className
}: VariantProps<typeof plateVariants> & {
	code: string;
	number?: string;
	suffix?: string;
	muted?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn(plateVariants({ size }), className)}
			aria-label={[code, number, suffix].filter(Boolean).join(" ")}
		>
			<span>{code}</span>
			{number ? <span className={cn(muted && "text-ink-300")}>{number}</span> : null}
			{suffix ? <span className={cn(muted && "text-ink-300")}>{suffix}</span> : null}
		</div>
	);
}
