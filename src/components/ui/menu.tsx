"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./icon";

export type MenuEntry =
	{ label: string; icon: IconName; onSelect: () => void; danger?: boolean } | "separator";

/**
 * Actions behind one trigger. Arrow keys move, Enter picks, Esc closes and gives focus back
 * to the trigger; a click outside closes it too. The caller styles the trigger and places the
 * list: `menuClassName` carries its position and width.
 */
export function Menu({
	label,
	icon,
	entries,
	iconOnly = false,
	caret,
	className = "",
	triggerClassName,
	menuClassName
}: {
	label: string;
	icon: IconName;
	entries: MenuEntry[];
	/** The trigger shows only its icon; the label still names it. */
	iconOnly?: boolean;
	/** The arrow at the end of the trigger, pointing where the list opens. */
	caret?: "up" | "down";
	className?: string;
	triggerClassName: string;
	menuClassName: string;
}) {
	const id = useId();
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const items = entries.filter((entry) => entry !== "separator");

	useEffect(() => {
		if (!open) return;
		const outside = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, [open]);
	useEffect(() => {
		if (open) root.current?.querySelectorAll<HTMLElement>("[role=menuitem]")[active]?.focus();
	}, [open, active]);

	const close = (refocus: boolean) => {
		setOpen(false);
		if (refocus) trigger.current?.focus();
	};
	const pick = (index: number) => {
		close(true);
		items[index]?.onSelect();
	};
	const onKey = (event: React.KeyboardEvent) => {
		// A closed menu leaves the keys to the page: Esc leaves the keyboard page, arrows scroll.
		if (!open) return;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActive((index) => (index + step + items.length) % items.length);
		} else if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			close(true);
		} else if (event.key === "Tab") close(false);
	};

	let index = -1;
	return (
		<div ref={root} className={`relative ${className}`} onKeyDown={onKey}>
			<button
				ref={trigger}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
				aria-label={iconOnly ? label : undefined}
				onClick={() => {
					setActive(0);
					setOpen((value) => !value);
				}}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown" && !open) {
						event.preventDefault();
						setActive(0);
						setOpen(true);
					}
				}}
				className={triggerClassName}
			>
				<Icon name={icon} />
				{!iconOnly && <span>{label}</span>}
				{caret && (
					<Icon
						name="chevron-down"
						size={16}
						className={`ml-auto ${caret === "up" ? "rotate-180" : ""}`}
					/>
				)}
			</button>
			{open && (
				<div
					id={id}
					role="menu"
					aria-label={label}
					className={`absolute z-40 flex flex-col overflow-y-auto rounded-md border border-hairline bg-paper-0 p-1 shadow-overlay ${menuClassName}`}
				>
					{entries.map((entry, position) => {
						if (entry === "separator")
							return (
								<div
									key={`separator-${position}`}
									role="separator"
									className="my-1 h-px flex-none bg-hairline"
								/>
							);
						const at = ++index;
						// Keyboard focus shows like hover; the focus a mouse open puts on the first item does not.
						const tone = entry.danger
							? "text-stop-700 hover:bg-stop-100 focus-visible:bg-stop-100"
							: "text-ink-1000 hover:bg-paper-50 focus-visible:bg-paper-50";
						return (
							<button
								key={entry.label}
								type="button"
								role="menuitem"
								tabIndex={-1}
								onClick={() => pick(at)}
								onPointerEnter={() => setActive(at)}
								className={`flex h-11 flex-none cursor-pointer items-center gap-3 rounded-sm px-3 text-left outline-none type-body lg:h-10 ${tone}`}
							>
								<Icon
									name={entry.icon}
									size={16}
									color={entry.danger ? "bg-stop-700" : "bg-black"}
								/>
								{entry.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
