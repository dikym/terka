import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelTextVariants = cva("font-display text-label font-semibold uppercase", {
	variants: {
		tone: { muted: "text-ink-500", ink: "text-ink-1000", brand: "text-caution-700" }
	},
	defaultVariants: { tone: "muted" }
});

export function LabelText({
	className,
	tone,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof labelTextVariants>) {
	return <span className={cn(labelTextVariants({ tone }), className)} {...props} />;
}
