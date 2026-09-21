import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabelText } from "@/components/ui/label-text";

export type IslandGroup =
	"sumatera" | "jawa" | "kalimantan" | "sulawesi" | "balinusra" | "maluku" | "papua";

export const islandGroupBackgroundClasses: Record<IslandGroup, string> = {
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
	tree = Boolean(group),
	depth = 0,
	active,
	expanded,
	leaf,
	mono,
	highlighted,
	onClick,
	className
}: {
	name: string;
	count: string;
	percent: string;
	group?: IslandGroup;
	/** Rendered inside a ScopeTree; defaults to true for grouped nodes. */
	tree?: boolean;
	depth?: number;
	active?: boolean;
	expanded?: boolean;
	leaf?: boolean;
	mono?: boolean;
	highlighted?: boolean;
	className?: string;
	onClick?: () => void;
}) {
	const Chevron = expanded ? ChevronDown : ChevronRight;
	return (
		<button
			type="button"
			onClick={onClick}
			role={tree ? "treeitem" : undefined}
			aria-selected={tree ? active : undefined}
			aria-expanded={tree && !leaf ? expanded : undefined}
			className={cn(
				"box-border flex min-h-12 items-center gap-3 rounded-sm border border-ink-200 bg-paper-0 p-3 text-left transition-[border-color,box-shadow] duration-90 ease-out hover:border-ink-1000 hover:shadow-[2px_2px_0_var(--color-ink-1000)]",
				active && "border-ink-1000 bg-paper-50",
				highlighted && "border-2 border-ink-1000 shadow-[2px_2px_0_var(--color-ink-1000)]",
				className
			)}
			style={group ? { marginLeft: `${(depth + 1) * 20}px` } : undefined}
		>
			{leaf ? null : (
				<span className="grid size-6 shrink-0 place-items-center">
					<Chevron className="size-5.5 text-ink-700" aria-hidden />
				</span>
			)}
			<span
				className={cn(
					"size-2.5 shrink-0 rounded-full",
					group ? islandGroupBackgroundClasses[group] : "bg-ink-1000"
				)}
				aria-hidden
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				{active ? <LabelText tone="brand">Aktif sekarang</LabelText> : null}
				<span className="flex items-baseline justify-between gap-2">
					<span
						className={cn(
							"truncate text-body-lg leading-[1.2] text-ink-1000",
							mono
								? "font-mono font-bold tracking-plate"
								: "font-display font-semibold"
						)}
					>
						{name}
					</span>
					<span className="shrink-0 font-mono text-body-sm leading-none text-ink-500">
						{count}
					</span>
				</span>
				<span className="flex items-center gap-2">
					<span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-xs bg-ink-100">
						<span
							className={cn(
								"block h-full",
								group ? islandGroupBackgroundClasses[group] : "bg-ink-1000"
							)}
							style={{ width: percent }}
						/>
					</span>
					<span className="w-9 shrink-0 text-right font-mono text-body-sm leading-none font-medium text-ink-900 tabular-nums">
						{percent}
					</span>
				</span>
			</span>
		</button>
	);
}
