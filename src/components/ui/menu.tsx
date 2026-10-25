"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./icon";

export type MenuEntry =
	{ label: string; icon: IconName; onSelect: () => void; danger?: boolean } | "separator";

/**
 * Actions behind one trigger. Arrow keys move, Enter picks, Esc closes and gives focus back
 * to the trigger; a click outside closes it too.
 */
export function Menu({
	label,
	icon,
	entries
}: {
	label: string;
	icon: IconName;
	entries: MenuEntry[];
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
		<div ref={root} className="relative inline-flex flex-col items-end" onKeyDown={onKey}>
			<button
				ref={trigger}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
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
				className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-3 font-display text-body-sm leading-none font-semibold text-ink-1000"
			>
				<Icon name={icon} size={16} />
				{label}
				<Icon name="chevron-down" size={16} />
			</button>
			{open && (
				<div
					id={id}
					role="menu"
					aria-label={label}
					className="absolute top-[calc(100%+8px)] right-0 z-40 flex min-w-60 flex-col rounded-md border border-ink-1000 bg-paper-0 p-1 shadow-overlay"
				>
					{entries.map((entry, position) => {
						if (entry === "separator")
							return (
								<div
									key={`separator-${position}`}
									role="separator"
									className="my-1 h-px bg-hairline"
								/>
							);
						const at = ++index;
						const current = at === active;
						const tone = entry.danger
							? `text-stop-700 hover:bg-stop-100 ${current ? "bg-stop-100" : ""}`
							: `text-ink-1000 hover:bg-paper-50 ${current ? "bg-caution-100" : ""}`;
						return (
							<button
								key={entry.label}
								type="button"
								role="menuitem"
								tabIndex={-1}
								onClick={() => pick(at)}
								onPointerEnter={() => setActive(at)}
								className={`flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-left outline-none type-body ${tone}`}
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
