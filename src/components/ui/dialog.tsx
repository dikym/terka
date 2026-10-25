"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./button";
import { Icon } from "./icon";
import { useFocusTrap } from "./use-focus-trap";

export const typedMatches = (word: string, value: string) => value !== "" && value === word;

// The disabled final button turns grey instead of fading, so it reads as not yet allowed.
const DISABLED_GREY =
	"disabled:border-ink-200 disabled:bg-ink-100 disabled:text-ink-500 disabled:opacity-100 disabled:shadow-none";

/**
 * The scrim and panel shared by every dialog. On a phone the panel is a bottom sheet with a
 * handle and rounded top corners; Esc and the scrim do what the safe button does.
 */
function Overlay({
	role,
	labelledBy,
	describedBy,
	onDismiss,
	padded = true,
	children
}: {
	role: "dialog" | "alertdialog";
	labelledBy: string;
	describedBy?: string;
	onDismiss: () => void;
	/** False for the modal, whose header and body carry their own padding. */
	padded?: boolean;
	children: React.ReactNode;
}) {
	const panel = useRef<HTMLDivElement>(null);
	useFocusTrap(panel);
	const latest = useRef(onDismiss);
	useEffect(() => {
		latest.current = onDismiss;
	});
	useEffect(() => {
		const before = document.activeElement as HTMLElement | null;
		const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
		(first ?? panel.current)?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			latest.current();
		};
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			before?.focus();
		};
	}, []);
	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
			<div
				aria-hidden="true"
				onClick={onDismiss}
				className="absolute inset-0 bg-[oklch(0.14_0.012_60/0.45)]"
			/>
			<div
				ref={panel}
				role={role}
				aria-modal="true"
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				tabIndex={-1}
				className={`relative flex max-h-[90dvh] w-full flex-col overflow-y-auto rounded-t-lg border-t border-ink-1000 bg-paper-0 shadow-overlay outline-none lg:w-120 lg:rounded-lg lg:border ${padded ? "gap-5 px-5 pt-3 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))] lg:p-6" : "pb-[env(safe-area-inset-bottom)] lg:pb-0"}`}
			>
				<span
					aria-hidden="true"
					className={`h-1 w-10 flex-none self-center rounded-full bg-ink-300 lg:hidden ${padded ? "" : "mt-3"}`}
				/>
				{children}
			</div>
		</div>
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
		<p id={id} className="m-0 text-pretty text-ink-900 type-prose">
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
	/** Full-width buttons, the safest first. */
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
			<footer className="flex flex-col gap-3 px-6 pb-6">{actions}</footer>
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
	destructive
}: {
	title: string;
	children: React.ReactNode;
	safe: { label: string; icon?: Parameters<typeof Button>[0]["icon"]; onClick: () => void };
	destructive: { label: string; onClick: () => void };
}) {
	const id = useId();
	return (
		<Overlay
			role="alertdialog"
			labelledBy={id}
			describedBy={`${id}-text`}
			onDismiss={safe.onClick}
		>
			<div className="flex flex-col gap-2">
				<Heading id={id}>{title}</Heading>
				<Body id={`${id}-text`}>{children}</Body>
			</div>
			<div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-end">
				<Button variant="secondary" className="max-lg:w-full" onClick={destructive.onClick}>
					{destructive.label}
				</Button>
				<Button
					icon={safe.icon}
					className="max-lg:w-full"
					data-autofocus
					onClick={safe.onClick}
				>
					{safe.label}
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
	onConfirm
}: {
	title: string;
	word: string;
	children: React.ReactNode;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const id = useId();
	const [value, setValue] = useState("");
	const ready = typedMatches(word, value);
	return (
		<Overlay role="alertdialog" labelledBy={id} describedBy={`${id}-text`} onDismiss={onCancel}>
			<div className="flex flex-col gap-2">
				<Heading id={id}>{title}</Heading>
				<Body id={`${id}-text`}>{children}</Body>
			</div>
			<input
				data-autofocus
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && ready) onConfirm();
				}}
				aria-label={`Ketik ${word}`}
				autoComplete="off"
				autoCapitalize="characters"
				spellCheck={false}
				className="h-12 w-full rounded-sm border border-ink-1000 bg-paper-0 px-4 font-mono text-body-lg leading-none font-medium tracking-[0.08em] text-ink-1000"
			/>
			<div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
				<Button variant="ghost" className="text-ink-1000 max-lg:w-full" onClick={onCancel}>
					Batal
				</Button>
				<Button
					variant="stop"
					disabled={!ready}
					aria-disabled={!ready}
					className={`max-lg:w-full ${DISABLED_GREY}`}
					onClick={onConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</Overlay>
	);
}
