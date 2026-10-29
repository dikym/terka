import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";

const COLUMN = {
	preview: "max-w-preview gap-6",
	question: "max-w-question gap-5",
	// A phone sets the summary tighter than the questions.
	end: "max-w-question gap-4 lg:gap-5"
};

const MAIN = {
	// A phone preview fills the screen so its buttons can sit at the bottom.
	preview: "flex-1 py-6 lg:flex-none lg:pt-10 lg:pb-12",
	question: "flex-1 pt-4 pb-6 lg:flex-none lg:py-10",
	end: "flex-1 pt-4 pb-6 lg:flex-none lg:py-10"
};

/** Chrome-free session layout: a top bar over a centred column. */
export function SessionFrame({
	bar,
	meta,
	footer,
	variant = "question",
	children
}: {
	bar: React.ReactNode;
	/** A phone's bottom action bar; desktop keeps the action inside the column. */
	footer?: React.ReactNode;
	/** The bar's second row, which a phone moves to the top of the column. */
	meta?: React.ReactNode;
	variant?: keyof typeof COLUMN;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-dvh flex-col bg-paper-0">
			{bar}
			<main className={`flex justify-center bg-paper-0 px-4 lg:px-8 ${MAIN[variant]}`}>
				<div className={`flex w-full min-w-0 flex-col ${COLUMN[variant]}`}>
					{meta && <div className="lg:hidden">{meta}</div>}
					{children}
				</div>
			</main>
			{footer && (
				<div className="sticky bottom-0 z-30 transform-gpu border-t border-hairline bg-paper-0 px-4 pt-3 pb-[calc(--spacing(4)+env(safe-area-inset-bottom))] lg:hidden">
					{footer}
				</div>
			)}
		</div>
	);
}

const PHONE_BAR = {
	session: "h-15 gap-2 px-1",
	preview: "min-h-15 gap-5 px-4 py-2"
};

export function TopBar({
	variant = "session",
	className = "",
	children
}: {
	/** The phone layout: a 60 px session bar, or the preview's padded one. */
	variant?: keyof typeof PHONE_BAR;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		// On a phone both sticky bars get a layer of their own: iOS leaves one unpainted until the
		// page is scrolled when the screen changes under it, as at the end of a session.
		<div
			className={`sticky top-0 z-30 flex items-center border-b border-hairline bg-paper-0 max-lg:transform-gpu lg:static lg:h-auto lg:min-h-0 lg:gap-5 lg:px-6 lg:py-4 ${PHONE_BAR[variant]} ${className}`}
		>
			{children}
		</div>
	);
}

export function BarButton({
	icon,
	phoneIcon,
	large = false,
	label,
	onClick,
	kbd,
	disabled = false
}: {
	icon: "arrow-left" | "undo-2" | "x";
	/** A different glyph below `lg`: a phone session exits with a cross. */
	phoneIcon?: "x";
	/** The phone's 44 px target with a 20 px glyph; desktop keeps 36 px. */
	large?: boolean;
	label: string;
	onClick?: () => void;
	/** The shortcut the tooltip names. */
	kbd?: string;
	disabled?: boolean;
}) {
	const glyph = large ? "size-5 lg:size-4.5" : "size-4.5";
	return (
		<Tooltip content={label} kbd={kbd}>
			<button
				type="button"
				aria-label={label}
				aria-keyshortcuts={kbd}
				onClick={onClick}
				disabled={disabled}
				className={`inline-flex flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-ink-700 disabled:cursor-not-allowed disabled:opacity-40 ${large ? "size-11 lg:size-9" : "size-9"}`}
			>
				<Icon
					name={icon}
					size={null}
					className={`${glyph} ${phoneIcon ? "max-lg:hidden" : ""}`}
				/>
				{phoneIcon && (
					<Icon name={phoneIcon} size={null} className={`${glyph} lg:hidden`} />
				)}
			</button>
		</Tooltip>
	);
}
