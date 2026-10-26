import { GROUP_BG, type GroupId } from "./groups";

export function ProgressBar({
	value,
	color = "bg-ink-1000",
	className = "h-1.5 flex-1 min-w-0"
}: {
	/** 0–100. */
	value: number;
	/** A `bg-*` class for the filled part. */
	color?: string;
	/** Height and flex sizing of the track. */
	className?: string;
}) {
	const percent = Math.max(0, Math.min(100, value));
	return (
		<div className={`overflow-hidden rounded-xs bg-ink-100 ${className}`}>
			<div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
		</div>
	);
}

const PILL = {
	learning: "bg-caution-100 text-caution-700",
	leech: "bg-grape-100 text-grape-700",
	suspended: "bg-paper-50 text-ink-700",
	off: "bg-paper-50 text-ink-500",
	neutral: "bg-caution-100 text-ink-1000"
};

/** The dotted status pill: "Sedang dipelajari", "Sulit dikuasai", "Dinonaktifkan". */
export function Pill({
	tone,
	children,
	className = ""
}: {
	tone: keyof typeof PILL;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex w-fit items-center gap-2 rounded-full border border-transparent px-2.5 py-1 type-label whitespace-nowrap ${PILL[tone]} ${className}`}
		>
			<span className="size-[7px] flex-none rounded-full bg-current" />
			{children}
		</span>
	);
}

export function RegionDot({ group, size = "size-2" }: { group: GroupId; size?: string }) {
	return <span className={`inline-block flex-none rounded-full ${size} ${GROUP_BG[group]}`} />;
}

/** A pulsing placeholder; give it the size of what it stands in for. */
export function Skeleton({ className, width }: { className: string; width?: string }) {
	return (
		<span
			data-skeleton
			className={`inline-block animate-skl bg-ink-100 ${className}`}
			style={width ? { width } : undefined}
		/>
	);
}

/** A placeholder for one line of text, sized in em so it scales with the font. */
export function SkeletonText({ width, className = "" }: { width: string; className?: string }) {
	return (
		<span
			data-skeleton
			className={`inline-block h-[0.72em] max-w-full animate-skl rounded-[3px] bg-ink-100 align-middle ${className}`}
			style={{ width }}
		/>
	);
}

export function Switch({
	checked,
	onChange,
	label,
	disabled = false
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`inline-flex h-7 w-11.5 flex-none cursor-pointer items-center rounded-full border border-ink-200 p-[3px] disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "justify-end bg-go-500" : "justify-start bg-paper-50"}`}
		>
			<span
				className={`block size-5 rounded-full ${checked ? "bg-paper-0" : "bg-ink-1000"}`}
			/>
		</button>
	);
}

const CALLOUT = {
	neutral: { box: "bg-paper-50 text-ink-1000", label: "text-ink-700" },
	warn: { box: "bg-caution-100 text-ink-1000", label: "text-ink-1000" },
	danger: { box: "bg-stop-100 text-ink-1000", label: "text-stop-500" },
	success: { box: "bg-go-100 text-ink-1000", label: "text-go-700" },
	info: { box: "bg-sky-100 text-ink-1000", label: "text-sky-500" }
};

export function Callout({
	tone = "neutral",
	label,
	children
}: {
	tone?: keyof typeof CALLOUT;
	label?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`flex flex-col gap-2 rounded-md border border-hairline p-4 ${CALLOUT[tone].box}`}
		>
			{label && (
				<span
					className={`inline-flex items-center gap-2 type-label ${CALLOUT[tone].label}`}
				>
					{label}
				</span>
			)}
			<div className="type-body">{children}</div>
		</div>
	);
}

/** Skeleton width for a piece of copy: about half an em per character, at least 1.2em. */
export const skeletonWidth = (text: string) =>
	`${Math.max(1.2, Math.round(text.length * 5.5) / 10)}em`;
