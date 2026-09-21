"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import styles from "./confirm-dialog.module.css";

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	tone = "default",
	confirmLabel,
	cancelLabel,
	onConfirm,
	busy
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: React.ReactNode;
	tone?: "default" | "danger";
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
	busy?: boolean;
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			onClose={() => onOpenChange(false)}
			onClick={(event) => {
				if (event.target === ref.current) onOpenChange(false);
			}}
			onCancel={(event) => {
				event.preventDefault();
				onOpenChange(false);
			}}
			className={cn(
				"m-auto w-105 max-w-[calc(100%-2rem)] overflow-hidden rounded-md border border-ink-200 bg-paper-0 p-0",
				"backdrop:bg-ink-1000/40",
				styles.dialog
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-paper-50 px-4 py-2">
				<p className="font-display text-label font-semibold uppercase">{title}</p>
				<IconButton
					label="Tutup"
					className="size-6 hover:bg-ink-100 hover:text-ink-1000"
					onClick={() => onOpenChange(false)}
				>
					<X className="size-4" />
				</IconButton>
			</div>
			<div className="p-4">
				{description ? (
					<p className="text-body-sm leading-relaxed text-ink-900">{description}</p>
				) : null}
				<div className={cn("flex justify-end gap-2", description ? "mt-4" : "")}>
					{cancelLabel ? (
						<Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
							{cancelLabel}
						</Button>
					) : null}
					<Button
						variant={tone === "danger" ? "stop" : "primary"}
						size="sm"
						disabled={busy}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</dialog>
	);
}
