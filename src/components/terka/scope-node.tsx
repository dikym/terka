import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabelText } from "@/components/ui/label-text";

export type IslandGroup =
	"sumatera" | "jawa" | "kalimantan" | "sulawesi" | "balinusra" | "maluku" | "papua";

export const groupDotClass: Record<IslandGroup, string> = {
	sumatera: "bg-group-sumatera",
	jawa: "bg-group-jawa",
	kalimantan: "bg-group-kalimantan",
	sulawesi: "bg-group-sulawesi",
	balinusra: "bg-group-balinusra",
	maluku: "bg-group-maluku",
	papua: "bg-group-papua"
};

export function ScopeTree({ className, ...props }: React.ComponentProps<"div">) {
	return <div role="tree" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function ScopeNode({
	name,
	count,
	percent,
	group,
	depth = 0,
	active,
	expanded,
	leaf,
	className
}: {
	name: string;
	count: string;
	percent: string;
	group: IslandGroup;
	depth?: number;
	active?: boolean;
	expanded?: boolean;
	leaf?: boolean;
	className?: string;
}) {
	const Chevron = expanded ? ChevronDown : ChevronRight;
	return (
		<div
			role="treeitem"
			aria-selected={active}
			aria-expanded={leaf ? undefined : expanded}
			className={cn(
				"border-ink-200 bg-paper-0 box-border flex min-h-11 items-center gap-3 rounded-sm border p-3",
				active && "border-ink-1000 bg-paper-50",
				className
			)}
			style={{ paddingLeft: `${12 + depth * 20}px` }}
		>
			{leaf ? null : <Chevron className="text-ink-700 size-[22px] shrink-0" aria-hidden />}
			<span
				className={cn("size-2.5 shrink-0 rounded-full", groupDotClass[group])}
				aria-hidden
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				{active ? <LabelText tone="brand">Aktif sekarang</LabelText> : null}
				<span className="flex items-baseline justify-between gap-2">
					<span className="font-display text-body-lg text-ink-1000 truncate leading-[1.2] font-semibold">
						{name}
					</span>
					<span className="text-body-sm text-ink-500 shrink-0 font-mono">{count}</span>
				</span>
				<span className="flex items-center gap-2">
					<span className="bg-ink-100 h-1.5 min-w-0 flex-1 overflow-hidden rounded-xs">
						<span
							className={cn("block h-full", groupDotClass[group])}
							style={{ width: percent }}
						/>
					</span>
					<span className="text-body-sm text-ink-900 w-9 shrink-0 text-right font-mono font-medium tabular-nums">
						{percent}
					</span>
				</span>
			</span>
		</div>
	);
}
