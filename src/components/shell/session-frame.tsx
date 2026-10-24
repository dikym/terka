import { Icon } from "@/components/ui/icon";

const COLUMN = {
	preview: "max-w-preview gap-6",
	question: "max-w-question gap-5"
};

/** Chrome-free session layout: a top bar over a centred column. */
export function SessionFrame({
	bar,
	variant = "question",
	children
}: {
	bar: React.ReactNode;
	variant?: keyof typeof COLUMN;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-dvh flex-col bg-paper-0">
			{bar}
			<main
				className={`flex justify-center bg-paper-0 px-8 ${variant === "preview" ? "pt-10 pb-12" : "py-10"}`}
			>
				<div className={`flex w-full min-w-0 flex-col ${COLUMN[variant]}`}>{children}</div>
			</main>
		</div>
	);
}

export function TopBar({
	className = "",
	children
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`flex items-center gap-5 border-b border-hairline bg-paper-0 px-6 py-4 ${className}`}
		>
			{children}
		</div>
	);
}

export function BarButton({
	icon,
	label,
	onClick,
	disabled = false
}: {
	icon: "arrow-left" | "undo-2" | "x";
	label: string;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			disabled={disabled}
			className="inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
		>
			<Icon name={icon} size={18} />
		</button>
	);
}
