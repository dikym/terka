import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const calloutVariants = cva("flex gap-3 rounded-sm border px-4 py-3 text-body-sm text-ink-900", {
	variants: {
		tone: {
			info: "border-ink-200 bg-paper-50",
			warn: "border-caution-500 bg-caution-100",
			danger: "border-stop-500 bg-stop-100",
			success: "border-go-500 bg-go-100"
		}
	},
	defaultVariants: { tone: "info" }
});

export function Callout({
	tone,
	title,
	icon,
	className,
	children
}: VariantProps<typeof calloutVariants> & {
	title?: React.ReactNode;
	icon?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div role="note" className={cn(calloutVariants({ tone }), className)}>
			{icon ? <span className="text-ink-700 mt-0.5 shrink-0">{icon}</span> : null}
			<div className="flex flex-col gap-1">
				{title ? (
					<span className="font-display text-ink-1000 font-semibold">{title}</span>
				) : null}
				<div>{children}</div>
			</div>
		</div>
	);
}
