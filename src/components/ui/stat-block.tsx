import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LabelText } from "./label-text";

const valueVariants = cva("font-bold text-ink-1000 tabular-nums", {
	variants: {
		size: { hero: "text-hero", display: "text-display", heading: "text-heading" },
		mono: { true: "font-mono", false: "font-display" }
	},
	defaultVariants: { size: "display", mono: false }
});

export function StatBlock({
	value,
	unit,
	label,
	size,
	mono,
	valueClassName,
	unitClassName,
	className
}: VariantProps<typeof valueVariants> & {
	value: React.ReactNode;
	unit?: React.ReactNode;
	label: React.ReactNode;
	valueClassName?: string;
	unitClassName?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<div className="flex items-baseline gap-2">
				<span className={cn(valueVariants({ size, mono }), valueClassName)}>{value}</span>
				{unit ? (
					<span className={cn("font-body text-body-md text-ink-700", unitClassName)}>
						{unit}
					</span>
				) : null}
			</div>
			<LabelText>{label}</LabelText>
		</div>
	);
}
