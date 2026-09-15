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

/** Small 28px group-bordered code pill (e.g. `DK`, `BD`) used in reference and stat rows. */
export function CodeBadge({
	code,
	group,
	className
}: {
	code: string;
	group: IslandGroup;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"bg-paper-0 font-plate text-body-sm tracking-plate text-ink-1000 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-sm border border-b-[3px] px-2.5 leading-none font-bold",
				groupBorderClass[group],
				className
			)}
		>
			{code}
		</span>
	);
}
