import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const chipVariants = cva(
	"inline-flex items-center justify-center rounded-sm border border-b-[3px] border-ink-1000 bg-paper-0 font-plate leading-none font-bold tracking-plate text-ink-1000",
	{
		variants: {
			tone: {
				default: "",
				wrong: "border-stop-500 bg-stop-100",
				right: "border-go-500 bg-go-100"
			},
			size: {
				lg: "h-[72px] min-w-14 px-2.5 text-title",
				sm: "h-7 min-w-7 px-2.5 text-body-sm"
			}
		},
		defaultVariants: { tone: "default", size: "lg" }
	}
);

export function CodeChip({
	tone,
	size,
	className,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
	return <span className={cn(chipVariants({ tone, size }), className)} {...props} />;
}
