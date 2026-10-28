"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { dismissToast, type ToastItem, type ToastTone, toastStore } from "@/lib/toasts";
import { Icon, type IconName } from "./icon";

const TONE: Record<ToastTone, { box: string; text: string; icon: string; glyph: IconName }> = {
	success: {
		box: "border-go-500 bg-go-100",
		text: "text-go-700",
		icon: "bg-go-700",
		glyph: "check"
	},
	info: {
		box: "border-ink-300 bg-paper-0",
		text: "text-ink-700",
		icon: "bg-ink-700",
		glyph: "info"
	},
	warn: {
		box: "border-caution-500 bg-caution-100",
		text: "text-caution-700",
		icon: "bg-caution-700",
		glyph: "circle-alert"
	},
	danger: {
		box: "border-stop-500 bg-stop-100",
		text: "text-stop-700",
		icon: "bg-stop-700",
		glyph: "circle-alert"
	}
};

export function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
	const tone = TONE[toast.tone];
	return (
		<div
			role={toast.tone === "danger" ? "alert" : "status"}
			className={`inline-flex w-full max-w-120 items-start gap-3 rounded-md border py-3 pr-2 pl-4 shadow-overlay lg:w-max ${tone.box}`}
		>
			<Icon name={toast.icon ?? tone.glyph} size={18} color={tone.icon} className="mt-px" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{toast.label && (
					<span className={`leading-[20px] type-label ${tone.text}`}>{toast.label}</span>
				)}
				<span className="font-sans text-body-md leading-[20px] font-medium text-ink-900">
					{toast.text}
				</span>
			</div>
			{toast.action && (
				<button
					type="button"
					onClick={() => {
						toast.action!.onClick();
						onClose();
					}}
					className="ml-2 inline-flex h-9 flex-none cursor-pointer items-center justify-center gap-2 self-center rounded-sm border border-ink-1000 bg-paper-0 px-3 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-1000"
				>
					{toast.action.icon && <Icon name={toast.action.icon} size={16} />}
					{toast.action.label}
				</button>
			)}
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

const NONE: ToastItem[] = [];

/** Every status message of the app, bottom right of the screen; one per page. */
export function ToastHost() {
	// A session screen has neither the sidebar nor the tab bar to clear.
	const bare = usePathname().startsWith("/sesi");
	const items = useSyncExternalStore(
		toastStore.subscribe,
		() => toastStore.getState().items,
		() => NONE
	);
	if (!items.length) return null;
	return (
		// On a phone the stack spans the screen and sits 16 px above the tab bar; on desktop it
		// sits 24 px from the right and bottom edges.
		<div
			className={`fixed inset-x-4 z-50 flex flex-col items-end gap-3 lg:inset-x-auto lg:right-6 lg:bottom-6 ${bare ? "bottom-[calc(--spacing(4)+env(safe-area-inset-bottom))]" : "bottom-[calc(--spacing(19)+env(safe-area-inset-bottom))]"}`}
		>
			{items.map((toast) => (
				<Toast key={toast.id} toast={toast} onClose={() => dismissToast(toast.id)} />
			))}
		</div>
	);
}
