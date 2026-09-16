import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LabelText } from "./label-text";

const calloutVariants = cva("rounded-md border p-4 text-body-md text-ink-1000", {
	variants: {
		tone: {
			info: "border-ink-200 bg-paper-50",
			sky: "border-ink-200 bg-sky-100",
			warn: "border-caution-500 bg-caution-100",
			danger: "border-stop-500 bg-stop-100",
			success: "border-go-500 bg-go-100"
		}
	},
	defaultVariants: { tone: "info" }
});

const titleToneClass: Record<NonNullable<VariantProps<typeof calloutVariants>["tone"]>, string> = {
	info: "text-ink-1000",
	sky: "text-sky-700",
	warn: "text-ink-1000",
	danger: "text-ink-1000",
	success: "text-ink-1000"
};

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
	const activeTone = tone ?? "info";
	return (
		<div
			role="note"
			className={cn(
				calloutVariants({ tone }),
				"flex",
				icon ? "gap-3" : "flex-col gap-2",
				className
			)}
		>
			{icon ? <span className="text-ink-700 mt-0.5 shrink-0">{icon}</span> : null}
			<div className={cn("flex flex-col gap-2", icon && "flex-1")}>
				{title ? (
					<LabelText className={titleToneClass[activeTone]}>{title}</LabelText>
				) : null}
				<div>{children}</div>
			</div>
		</div>
	);
}
