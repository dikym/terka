import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
	"inline-flex h-[72px] min-w-14 items-center justify-center rounded-sm border border-b-[3px] border-ink-1000 bg-paper-0 px-2.5 font-plate text-title leading-none font-bold tracking-plate text-ink-1000",
	{
		variants: {
			tone: {
				default: "",
				wrong: "border-stop-500 bg-stop-100",
				right: "border-go-500 bg-go-100"
			}
		},
		defaultVariants: { tone: "default" }
	}
);

export function CodeChip({
	tone,
	className,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
	return <span className={cn(chipVariants({ tone }), className)} {...props} />;
}
