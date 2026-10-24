const SIZE = {
	sm: "gap-[0.3em] px-[9px] py-1 text-[19px] tracking-[0.05em]",
	md: "gap-[0.35em] px-4.5 py-2.5 text-display tracking-plate",
	lg: "gap-[0.35em] px-4 py-2.5 text-[56px] tracking-plate lg:px-6 lg:py-3.5 lg:text-hero"
};

/** A civilian plate: white ground, 2 px ink border, plate face. */
export function Plate({
	code,
	number,
	suffix,
	size = "lg",
	highlight,
	className = ""
}: {
	code: string;
	number?: string;
	suffix?: string;
	size?: keyof typeof SIZE;
	/** The part the question is about, set in the brand's dark yellow. */
	highlight?: "code" | "number" | "suffix";
	className?: string;
}) {
	const part = (text: string, name: "code" | "number" | "suffix") => (
		<span className={highlight === name ? "text-caution-700" : "text-ink-1000"}>{text}</span>
	);
	return (
		<div
			className={`inline-flex items-center rounded-sm border-2 border-ink-1000 bg-paper-0 font-plate leading-none font-bold whitespace-nowrap text-ink-1000 ${SIZE[size]} ${className}`}
		>
			{part(code, "code")}
			{number && part(number, "number")}
			{suffix && part(suffix, "suffix")}
		</div>
	);
}

export function Wordmark() {
	return (
		<span className="flex">
			<span className="inline-flex items-center gap-[0.3em] rounded-sm border-2 border-ink-1000 bg-paper-0 px-[9px] py-1 font-plate text-[19px] leading-none font-bold tracking-[0.05em] text-ink-1000">
				T<span>3</span>
				<span>RKA</span>
			</span>
		</span>
	);
}

const SPECIAL_SIZE = {
	sm: "px-1.5 py-[3px] text-[15px]",
	md: "px-2 py-1 text-[20px]",
	lg: "px-3.5 py-[7px] text-[34px]"
};

/** A plate without a region: series, number and a third part, set on a three-column grid. */
export function SpecialPlate({
	parts,
	size = "sm",
	empty = false
}: {
	parts: [string, string, string];
	size?: keyof typeof SPECIAL_SIZE;
	/** The dashed placeholder plate of an empty search. */
	empty?: boolean;
}) {
	return (
		<span
			className={`inline-grid grid-cols-[minmax(1.3em,auto)_minmax(1.3em,auto)_minmax(1.3em,auto)] items-baseline justify-items-center gap-x-[0.35em] self-start rounded-sm border-2 bg-paper-0 font-plate leading-none font-bold tracking-plate whitespace-nowrap ${empty ? "border-dashed border-ink-300 text-ink-300" : "border-ink-1000 text-ink-1000"} ${SPECIAL_SIZE[size]}`}
		>
			{parts.map((part, index) => (
				<span key={index}>{part || "\u00a0"}</span>
			))}
		</span>
	);
}
