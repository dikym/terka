"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FadeScroll } from "@/components/ui/fade-scroll";
import { Icon } from "@/components/ui/icon";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { useScrollLock } from "@/components/ui/use-scroll-lock";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { useVisualViewportFit } from "@/components/ui/use-visual-viewport-fit";

export const typedMatches = (word: string, value: string) => value !== "" && value === word;

// The longest exit animation, `animate-sheet-out`, and a little over.
const EXIT_MS = 200;

// The disabled final button turns grey instead of fading, so it reads as not yet allowed.
const DISABLED_GREY =
	"disabled:border-ink-200 disabled:bg-ink-100 disabled:text-ink-500 disabled:opacity-100 disabled:shadow-[3px_3px_0_color-mix(in_oklch,var(--color-ink-1000)_40%,transparent)]";

/** Centres a field in the sheet's own scroll box when it is out of sight, never scrolling the page. */
function reveal(field: HTMLElement, sheet: HTMLElement) {
	for (let box = field.parentElement; box && sheet.contains(box); box = box.parentElement) {
		if (box.scrollHeight <= box.clientHeight) continue;
		const area = box.getBoundingClientRect();
		const rect = field.getBoundingClientRect();
		const viewport = window.visualViewport;
		const bottom = viewport
			? Math.min(area.bottom, viewport.offsetTop + viewport.height)
			: area.bottom;
		if (rect.top >= area.top && rect.bottom <= bottom) return;
		const top = box.scrollTop + rect.top + rect.height / 2 - (area.top + bottom) / 2;
		box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
		return;
	}
}

const isTextField = (target: EventTarget | null): target is HTMLElement =>
	target instanceof HTMLTextAreaElement ||
	(target instanceof HTMLInputElement &&
		!["checkbox", "radio", "button", "file"].includes(target.type));

/**
 * Plays a dialog's exit on a copy left in the page, because the callers unmount it outright and
 * have no closing state to wait for. The copy is only a picture: nothing can reach or read it.
 */
function useExitClone(
	root: React.RefObject<HTMLElement | null>,
	panel: React.RefObject<HTMLElement | null>
) {
	useLayoutEffect(() => {
		const element = root.current;
		const sheet = panel.current;
		if (!element || !sheet) return;
		return () => {
			// A sheet swiped away has already left the screen.
			if (sheet.style.transform) return;
			const copy = element.cloneNode(true) as HTMLElement;
			copy.dataset.dialogGhost = "";
			copy.inert = true;
			copy.setAttribute("aria-hidden", "true");
			copy.classList.add("pointer-events-none");
			for (const node of copy.querySelectorAll("[id], [role]")) {
				node.removeAttribute("id");
				node.removeAttribute("role");
			}
			const [shade, front] = copy.children;
			shade.classList.replace("animate-fade-in", "animate-fade-out");
			front.classList.replace("animate-sheet-in", "animate-sheet-out");
			front.classList.replace("lg:animate-dialog-in", "lg:animate-dialog-out");
			const nodes = [...sheet.querySelectorAll("*")];
			const scrolled = nodes.map((node) => node.scrollTop);
			// StrictMode's simulated unmount keeps the element on the page; a real one has removed it.
			queueMicrotask(() => {
				if (element.isConnected) return;
				document.body.append(copy);
				const copies = copy.children[1].querySelectorAll("*");
				scrolled.forEach((top, index) => {
					if (top) copies[index].scrollTop = top;
				});
				setTimeout(() => copy.remove(), EXIT_MS);
			});
		};
	}, [root, panel]);
}

/**
 * The scrim and panel shared by every dialog. On a phone the panel is a bottom sheet with a
 * handle and rounded top corners that can be swiped down; Esc, the scrim and the swipe do what
 * the safe button does. The page behind stays frozen.
 */
function Overlay({
	role,
	labelledBy,
	describedBy,
	onDismiss,
	locked = false,
	padded = true,
	children
}: {
	role: "dialog" | "alertdialog";
	labelledBy: string;
	describedBy?: string;
	onDismiss: () => void;
	locked?: boolean;
	/** False for the modal, whose header and body carry their own padding. */
	padded?: boolean;
	children: React.ReactNode;
}) {
	const root = useRef<HTMLDivElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const scrim = useRef<HTMLDivElement>(null);
	useVisualViewportFit(root);
	useFocusTrap(panel);
	useScrollLock();
	// While its work runs the dialog holds, so the outcome is not lost behind a closed panel.
	const dismiss = () => {
		if (!locked) onDismiss();
	};
	useSheetDrag(panel, scrim, dismiss, locked);
	useExitClone(root, panel);
	const latest = useRef(dismiss);
	useEffect(() => {
		latest.current = dismiss;
	});
	useEffect(() => {
		const sheet = panel.current;
		if (!sheet) return;
		const before = document.activeElement as HTMLElement | null;
		// iOS Safari pans the whole page to a field it focuses, even on a frozen page. Re-focusing the
		// field with preventScroll while the old focus is still leaving skips that pan; the sheet then
		// rises with the visual viewport and the field is scrolled into view inside the sheet only.
		const onBlur = (event: FocusEvent) => {
			const next = event.relatedTarget;
			if (isTextField(next) && sheet.contains(next)) {
				next.focus({ preventScroll: true });
				const viewport = window.visualViewport;
				if (isTextField(event.target) || !viewport) reveal(next, sheet);
				else viewport.addEventListener("resize", () => reveal(next, sheet), { once: true });
			} else if (!next && event.target instanceof Node && sheet.contains(event.target)) {
				// iOS's hide-keyboard key sends focus to <body>. Without a focused element in the sheet
				// the next tap on the field fires no blur, and the page would pan again.
				sheet.focus({ preventScroll: true });
			}
		};
		document.addEventListener("blur", onBlur, true);
		const first = sheet.querySelector<HTMLElement>("[data-autofocus]");
		(first ?? sheet).focus({ preventScroll: true });
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			latest.current();
		};
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("blur", onBlur, true);
			document.removeEventListener("keydown", onKey, true);
			before?.focus();
		};
	}, []);
	// Portalled to <body> so the absolute overlay is placed against the document, not an ancestor.
	return createPortal(
		<div
			ref={root}
			className="absolute top-0 left-0 z-50 flex h-dvh w-full items-end justify-center lg:items-center lg:p-6"
		>
			{/* Runs on below the visible area so the scrim also lies behind the keyboard. */}
			<div
				ref={scrim}
				aria-hidden="true"
				onClick={dismiss}
				className="absolute inset-x-0 top-0 -bottom-[100lvh] animate-fade-in touch-none bg-[oklch(0.14_0.012_60/0.45)]"
			/>
			<div
				ref={panel}
				role={role}
				aria-modal="true"
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				tabIndex={-1}
				className={`relative flex max-h-[90%] w-full animate-sheet-in flex-col rounded-t-lg bg-paper-0 shadow-[0_calc(100lvh+12px)_0_100lvh_var(--color-paper-0)] outline-none lg:w-120 lg:animate-dialog-in lg:rounded-lg lg:border lg:border-ink-1000 lg:shadow-overlay ${padded ? "gap-2 py-3 lg:p-0" : "pb-[env(safe-area-inset-bottom)] lg:pb-0"}`}
			>
				<span
					aria-hidden="true"
					className={`h-1 w-10 flex-none self-center rounded-full bg-ink-300 lg:hidden ${padded ? "" : "mt-3"}`}
				/>
				{/* Only the content scrolls, under a fixed handle. Most spacing sits inside the scroll box, so a
				    scrolled sheet keeps just a slim gap at each edge; the safe-area spacer is an ::after because
				    bottom padding of a scrolling flex box is not reliably kept. The scroll box clips what is
				    drawn past it, so on a desktop the panel padding sits inside it to keep focus rings and
				    button shadows whole. */}
				<FadeScroll
					className={`min-h-0 overscroll-contain ${padded ? "flex flex-col gap-5 px-5 pt-3 *:shrink-0 after:h-[env(safe-area-inset-bottom)] after:shrink-0 lg:p-6 lg:after:hidden" : ""}`}
				>
					{children}
				</FadeScroll>
			</div>
		</div>,
		document.body
	);
}

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<h2 id={id} className="m-0 type-card-title">
			{children}
		</h2>
	);
}

function Body({ id, children }: { id?: string; children: React.ReactNode }) {
	return (
		<p id={id} className="m-0 text-ink-900 type-prose">
			{children}
		</p>
	);
}

/** A decision that blocks the flow; closing it does what the safest choice does. */
export function Modal({
	title,
	onClose,
	children,
	actions
}: {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	/** The safest first: on a phone it is on top, on a desktop the other action sits on its left. */
	actions: React.ReactNode;
}) {
	const id = useId();
	return (
		<Overlay role="dialog" labelledBy={id} onDismiss={onClose} padded={false}>
			<header className="flex items-center justify-between gap-3 border-b border-hairline py-3 pr-3 pl-6">
				<Heading id={id}>{title}</Heading>
				<button
					type="button"
					aria-label="Tutup"
					onClick={onClose}
					className="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent"
				>
					<Icon name="x" size={18} />
				</button>
			</header>
			<div className="p-6">
				<Body>{children}</Body>
			</div>
			<footer className="flex flex-col gap-3 px-6 pb-6 lg:flex-row-reverse lg:justify-start">
				{actions}
			</footer>
		</Overlay>
	);
}

/**
 * For an action that cannot be undone. The safe choice is the primary button on the right and
 * takes the first focus; the destructive one sits on its left. On a phone the safe one is on top.
 */
export function ConfirmDialog({
	title,
	children,
	safe,
	destructive,
	busy = false
}: {
	title: string;
	children: React.ReactNode;
	safe: { label: string; icon?: Parameters<typeof Button>[0]["icon"]; onClick: () => void };
	destructive: { label: string; busyLabel?: string; onClick: () => void };
	busy?: boolean;
}) {
	const id = useId();
	return (
		<Overlay
			role="alertdialog"
			labelledBy={id}
			describedBy={`${id}-text`}
			onDismiss={safe.onClick}
			locked={busy}
		>
			<div className="flex flex-col gap-2">
				<Heading id={id}>{title}</Heading>
				<Body id={`${id}-text`}>{children}</Body>
			</div>
			<div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-end">
				<Button
					variant="secondary"
					size="sm"
					className="max-lg:w-full"
					loading={busy}
					busyLabel={destructive.busyLabel}
					onClick={destructive.onClick}
				>
					{destructive.label}
				</Button>
				<Button
					icon={safe.icon}
					size="sm"
					className="max-lg:w-full"
					data-autofocus
					disabled={busy}
					onClick={safe.onClick}
				>
					{safe.label}
				</Button>
			</div>
		</Overlay>
	);
}

/**
 * For removing one thing: a plain cancel on the left takes the first focus, the red action sits on
 * its right. On a phone the red action is on top and the cancel at the bottom.
 */
export function DangerConfirm({
	title,
	children,
	cancel,
	confirm,
	busy = false
}: {
	title: string;
	children: React.ReactNode;
	cancel: { label: string; onClick: () => void };
	confirm: { label: string; busyLabel?: string; onClick: () => void };
	busy?: boolean;
}) {
	const id = useId();
	return (
		<Overlay
			role="alertdialog"
			labelledBy={id}
			describedBy={`${id}-text`}
			onDismiss={cancel.onClick}
			locked={busy}
		>
			<div className="flex flex-col gap-2">
				<Heading id={id}>{title}</Heading>
				<Body id={`${id}-text`}>{children}</Body>
			</div>
			<div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-end">
				<Button
					variant="secondary"
					size="sm"
					className="max-lg:w-full"
					data-autofocus
					disabled={busy}
					onClick={cancel.onClick}
				>
					{cancel.label}
				</Button>
				<Button
					variant="stop"
					size="sm"
					className="max-lg:w-full"
					loading={busy}
					busyLabel={confirm.busyLabel}
					onClick={confirm.onClick}
				>
					{confirm.label}
				</Button>
			</div>
		</Overlay>
	);
}

/** Only for deleting the account: the final button waits for the exact word. */
export function TypedConfirm({
	title,
	word,
	children,
	confirmLabel,
	onCancel,
	onConfirm,
	busy = false,
	busyLabel
}: {
	title: string;
	word: string;
	children: React.ReactNode;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void;
	busy?: boolean;
	busyLabel?: string;
}) {
	const id = useId();
	const [value, setValue] = useState("");
	const ready = typedMatches(word, value);
	return (
		<Overlay
			role="alertdialog"
			labelledBy={id}
			describedBy={`${id}-text`}
			onDismiss={onCancel}
			locked={busy}
		>
			<div className="flex flex-col gap-2">
				<Heading id={id}>{title}</Heading>
				<Body id={`${id}-text`}>{children}</Body>
			</div>
			<input
				data-autofocus
				value={value}
				readOnly={busy}
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && ready && !busy) onConfirm();
				}}
				aria-label={`Ketik ${word}`}
				name="confirm-word"
				type="text"
				autoComplete="off"
				autoCapitalize="characters"
				autoCorrect="off"
				enterKeyHint="done"
				spellCheck={false}
				className="h-12 w-full rounded-sm border border-ink-1000 bg-paper-0 px-4 font-mono text-body-lg leading-none font-medium tracking-[0.08em] text-ink-1000"
			/>
			<div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-end">
				<Button
					variant="secondary"
					size="sm"
					className="max-lg:w-full"
					disabled={busy}
					onClick={onCancel}
				>
					Batal
				</Button>
				<Button
					variant="stop"
					size="sm"
					disabled={!ready}
					aria-disabled={!ready}
					loading={busy}
					busyLabel={busyLabel}
					className={`max-lg:w-full ${DISABLED_GREY}`}
					onClick={onConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</Overlay>
	);
}
