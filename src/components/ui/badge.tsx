import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-pill px-2 py-1 font-display text-label font-semibold uppercase",
	{
		variants: {
			tone: {
				ink: "bg-ink-1000 text-paper-25",
				brand: "bg-caution-100 text-caution-700",
				success: "bg-go-100 text-go-700",
				danger: "bg-stop-100 text-stop-700",
				warn: "bg-caution-100 text-caution-700",
				info: "bg-sky-100 text-sky-700",
				grape: "bg-grape-100 text-grape-700",
				tangerine: "bg-tangerine-100 text-tangerine-700",
				muted: "bg-paper-50 text-ink-700"
			}
		},
		defaultVariants: { tone: "muted" }
	}
);

export function Badge({
	className,
	tone,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
