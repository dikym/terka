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
		// On a phone the stack spans the screen and sits 16 px above the tab bar.
		<div className="fixed inset-x-4 bottom-[calc(--spacing(19)+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end">
			{children}
		</div>
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
			className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-md border py-3 pr-2 pl-4 shadow-overlay lg:w-max lg:max-w-120 ${action ? "lg:grid-cols-[auto_minmax(0,1fr)_auto_auto]" : ""} ${TONE[tone].box}`}
		>
			<Icon
				name={icon}
				size={18}
				color={TONE[tone].icon}
				className={`col-start-1 row-start-1 mt-px lg:mt-0 ${action ? "row-span-2 lg:row-span-1" : ""}`}
			/>
			<div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
				<span className={`leading-[20px] type-label ${TONE[tone].text}`}>{label}</span>
				<span className="font-sans text-body-md leading-[20px] font-medium text-pretty text-ink-900">
					{children}
				</span>
			</div>
			{/* Under the message on a phone, beside it on desktop. */}
			{action && (
				<div className="col-start-2 row-start-2 lg:col-start-3 lg:row-start-1 lg:ml-2 lg:self-center">
					{action}
				</div>
			)}
			<button
				type="button"
				onClick={onClose}
				aria-label="Tutup"
				className={`col-start-3 row-start-1 -my-1 ml-1 inline-flex size-7 flex-none ${action ? "lg:col-start-4" : ""} cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent`}
			>
				<Icon name="x" size={16} />
			</button>
		</div>
	);
}
