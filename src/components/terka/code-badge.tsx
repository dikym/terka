import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { IslandGroup } from "./scope-node";

const groupBorderClass: Record<IslandGroup, string> = {
	sumatera: "border-group-sumatera",
	jawa: "border-group-jawa",
	kalimantan: "border-group-kalimantan",
	sulawesi: "border-group-sulawesi",
	balinusra: "border-group-balinusra",
	maluku: "border-group-maluku",
	papua: "border-group-papua"
};

const codeBadgeVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-sm border border-b-3 bg-paper-0 px-2.5 font-plate leading-none font-bold tracking-plate text-ink-1000",
	{
		variants: {
			size: {
				sm: "h-7 min-w-7 text-body-sm",
				lg: "h-14 min-w-14 text-title"
			}
		},
		defaultVariants: { size: "sm" }
	}
);

export function CodeBadge({
	code,
	group,
	size,
	className
}: {
	code: string;
	group: IslandGroup;
	className?: string;
} & VariantProps<typeof codeBadgeVariants>) {
	return (
		<span className={cn(codeBadgeVariants({ size }), groupBorderClass[group], className)}>
			{code}
		</span>
	);
}
