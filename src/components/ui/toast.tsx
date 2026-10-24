import { Icon, type IconName } from "./icon";

const TONE = {
	warn: {
		box: "border-caution-500 bg-caution-100",
		text: "text-caution-700",
		icon: "bg-caution-700"
	},
	success: { box: "border-go-500 bg-go-100", text: "text-go-700", icon: "bg-go-700" }
};

export function Toasts({ children }: { children: React.ReactNode }) {
	return (
		<div className="fixed right-6 bottom-6 z-30 flex flex-col items-end gap-3">{children}</div>
	);
}

export function Toast({
	tone,
	icon,
	label,
	action,
	onClose,
	children
}: {
	tone: keyof typeof TONE;
	icon: IconName;
	label: string;
	action?: React.ReactNode;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div
			role="status"
			className={`inline-flex w-max max-w-120 items-start gap-3 rounded-md border py-3 pr-2 pl-4 shadow-overlay ${TONE[tone].box}`}
		>
			<Icon name={icon} size={18} color={TONE[tone].icon} />
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className={`leading-[20px] type-label ${TONE[tone].text}`}>{label}</span>
				<span className="font-sans text-body-md leading-[20px] font-medium text-pretty text-ink-900">
					{children}
				</span>
			</div>
			{action}
			<button
				type="button"
				onClick={onClose}
				aria-label="Tutup"
				className="-my-1 ml-1 inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent"
			>
				<Icon name="x" size={16} />
			</button>
		</div>
	);
}
