import { Tooltip } from "./tooltip";

const TONE = {
	default: "border-ink-200 bg-paper-0 text-ink-900",
	active: "border-ink-1000 bg-ink-1000 text-paper-25",
	unverified: "border-ink-200 bg-caution-100 text-ink-900"
};

const BASE =
	"inline-flex min-h-6.5 items-center gap-1.5 rounded-xs border px-[9px] font-sans text-body-sm leading-[1.2] font-medium whitespace-nowrap";

export function Tag({
	tone = "default",
	children,
	title
}: {
	tone?: keyof typeof TONE;
	children: React.ReactNode;
	title?: string;
}) {
	const tag = <span className={`${BASE} ${TONE[tone]}`}>{children}</span>;
	return title ? (
		<Tooltip content={title} align="start" focusable>
			{tag}
		</Tooltip>
	) : (
		tag
	);
}

export function TagButton({
	active,
	onClick,
	children
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={`${BASE} cursor-pointer ${active ? TONE.active : TONE.default}`}
		>
			{children}
		</button>
	);
}

/** Small dotted label: "Latihan dan Referensi", "Referensi saja", "Hanya format". */
export function DotLabel({
	tone = "muted",
	hint,
	children
}: {
	tone?: "go" | "muted";
	/** A short explanation of the term, shown as a tooltip. */
	hint?: string;
	children: React.ReactNode;
}) {
	const color = tone === "go" ? "text-go-700" : "text-ink-500";
	const label = (
		<span
			className={`inline-flex flex-none items-center gap-1.5 font-display text-label leading-none font-semibold tracking-[0.02em] whitespace-nowrap ${color}`}
		>
			<span className="size-[7px] flex-none bg-current dot" />
			{children}
		</span>
	);
	return hint ? (
		<Tooltip content={hint} align="start" focusable>
			{label}
		</Tooltip>
	) : (
		label
	);
}
