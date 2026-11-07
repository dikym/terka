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

export type ToastItem = ToastInput & {
	id: number;
	/** Closed, and still on screen while its exit plays. */
	leaving?: boolean;
};

const MAX_SHOWN = 3;
const AUTO_HIDE_MS = 10_000;
// The length of `animate-toast-out`. A timer rather than `animationend` removes the toast, because
// that event never fires when reduced motion or a hidden tab skips the animation.
const EXIT_MS = 160;
// Good news goes by itself; information, warnings and failures wait for the user.
const AUTO_HIDE = new Set<ToastTone>(["success"]);

const PEEK_PX = 8;
const GAP_PX = 12;
const SCALE_STEP = 0.04;

type Timer = { remaining: number; startedAt: number; cancel: (() => void) | null };

export function createToasts(
	schedule: (run: () => void, ms: number) => () => void,
	now: () => number = Date.now
) {
	const store = createStore<{ items: ToastItem[] }>()(() => ({ items: [] }));
	const timers = new Map<number, Timer>();
	let paused = false;
	let next = 1;

	const start = (id: number, timer: Timer) => {
		timer.startedAt = now();
		timer.cancel = schedule(() => dismiss(id), timer.remaining);
	};
	const clearTimer = (id: number) => {
		timers.get(id)?.cancel?.();
		timers.delete(id);
	};
	const leave = (id: number) => {
		clearTimer(id);
		store.setState(({ items }) => ({
			items: items.map((item) => (item.id === id ? { ...item, leaving: true } : item))
		}));
		schedule(() => {
			store.setState(({ items }) => ({ items: items.filter((item) => item.id !== id) }));
		}, EXIT_MS);
	};
	const dismiss = (id: number) => {
		const item = store.getState().items.find((candidate) => candidate.id === id);
		if (!item || item.leaving) return;
		leave(id);
		item.onDismiss?.();
	};
	const show = (input: ToastInput) => {
		const same =
			input.key === undefined
				? undefined
				: store.getState().items.find((item) => !item.leaving && item.key === input.key);
		const id = same?.id ?? next++;
		if (same) clearTimer(id);
		store.setState(({ items }) => ({
			items: [...items.filter((item) => item.id !== id), { ...input, id }]
		}));
		const live = store.getState().items.filter((item) => !item.leaving);
		if (live.length > MAX_SHOWN) {
			const older = live.slice(0, -1);
			const dropped =
				older.find((item) => item.tone === "success") ??
				older.find((item) => item.tone !== "danger") ??
				older[0];
			leave(dropped.id);
		}
		if (AUTO_HIDE.has(input.tone)) {
			const timer: Timer = { remaining: AUTO_HIDE_MS, startedAt: 0, cancel: null };
			timers.set(id, timer);
			if (!paused) start(id, timer);
		}
		return id;
	};
	const pause = () => {
		if (paused) return;
		paused = true;
		for (const timer of timers.values()) {
			timer.cancel?.();
			timer.cancel = null;
			timer.remaining -= now() - timer.startedAt;
		}
	};
	const resume = () => {
		if (!paused) return;
		paused = false;
		for (const [id, timer] of timers) start(id, timer);
	};
	return { store, show, dismiss, pause, resume };
}

/**
 * Where each card sits, measured up from the bottom of the stack, and the stack's height. A leaving
 * card takes no room and counts only the live cards newer than it, so it stays put while it fades.
 */
export function stackLayout(items: ToastItem[], heights: Record<number, number>, spread: boolean) {
	const live = items.filter((item) => !item.leaving);
	const front = live.at(-1);
	const frontHeight = front ? (heights[front.id] ?? 0) : 0;
	const cards: Record<number, { y: number; scale: number; clamp: number | null }> = {};
	let depth = 0;
	let lift = 0;
	for (const item of [...items].reverse()) {
		cards[item.id] = spread
			? { y: lift, scale: 1, clamp: null }
			: {
					y: depth * PEEK_PX,
					scale: 1 - depth * SCALE_STEP,
					clamp: depth === 0 ? null : frontHeight
				};
		if (item.leaving) continue;
		depth++;
		lift += (heights[item.id] ?? 0) + GAP_PX;
	}
	const height = !front ? 0 : spread ? lift - GAP_PX : frontHeight + (live.length - 1) * PEEK_PX;
	return { height, cards };
}

const toasts = createToasts((run, ms) => {
	const timer = setTimeout(run, ms);
	return () => clearTimeout(timer);
});
export const toastStore = toasts.store;
export const showToast = toasts.show;
export const dismissToast = toasts.dismiss;
export const pauseToasts = toasts.pause;
export const resumeToasts = toasts.resume;
