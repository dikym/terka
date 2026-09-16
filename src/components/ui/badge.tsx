import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-2 rounded-pill px-2.5 py-1 font-display text-label font-semibold uppercase",
	{
		variants: {
			tone: {
				ink: "bg-ink-1000 text-paper-25",
				brand: "bg-caution-100 text-caution-700",
				success: "bg-go-100 text-go-500",
				danger: "bg-stop-100 text-stop-500",
				warn: "bg-caution-100 text-caution-500",
				info: "bg-sky-100 text-sky-500",
				grape: "bg-grape-100 text-grape-700",
				tangerine: "bg-tangerine-100 text-tangerine-700",
				muted: "bg-paper-50 text-ink-700",
				neutral: "bg-paper-50 text-ink-900"
			}
		},
		defaultVariants: { tone: "muted" }
	}
);

export function Badge({
	className,
	tone,
	dot,
	children,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
	return (
		<span className={cn(badgeVariants({ tone }), className)} {...props}>
			{dot ? (
				<span className="size-[7px] shrink-0 rounded-full bg-current" aria-hidden />
			) : null}
			{children}
		</span>
	);
}
