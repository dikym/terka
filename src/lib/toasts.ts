import { createStore } from "zustand/vanilla";
import type { IconName } from "@/components/ui/icon";

export type ToastTone = "success" | "info" | "warn" | "danger";

export type ToastInput = {
	tone: ToastTone;
	text: string;
	/** A small caps heading above the text, naming the area the message is about. */
	label?: string;
	icon?: IconName;
	action?: { label: string; icon?: IconName; onClick: () => void };
	/** A later toast with the same key replaces this one instead of stacking. */
	key?: string;
	/** Runs when it closes or hides by itself; a toast replaced by key or pushed out does not. */
	onDismiss?: () => void;
};

export type ToastItem = ToastInput & { id: number };

const MAX_SHOWN = 3;
const AUTO_HIDE_MS = 10_000;
// Good news goes by itself; information, warnings and failures wait for the user.
const AUTO_HIDE = new Set<ToastTone>(["success"]);

export function createToasts(schedule: (run: () => void, ms: number) => void) {
	const store = createStore<{ items: ToastItem[] }>()(() => ({ items: [] }));
	let next = 1;
	const dismiss = (id: number) => {
		store
			.getState()
			.items.find((item) => item.id === id)
			?.onDismiss?.();
		store.setState(({ items }) => ({ items: items.filter((item) => item.id !== id) }));
	};
	const show = (input: ToastInput) => {
		const id = next++;
		store.setState(({ items }) => ({
			items: [
				...items.filter((item) => input.key === undefined || item.key !== input.key),
				{ ...input, id }
			].slice(-MAX_SHOWN)
		}));
		if (AUTO_HIDE.has(input.tone)) schedule(() => dismiss(id), AUTO_HIDE_MS);
		return id;
	};
	return { store, show, dismiss };
}

const toasts = createToasts((run, ms) => void setTimeout(run, ms));
export const toastStore = toasts.store;
export const showToast = toasts.show;
export const dismissToast = toasts.dismiss;
