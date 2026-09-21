"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import styles from "./toast.module.css";

export function Toast({ message, tone }: { message: string; tone: "warn" | "danger" }) {
	const [closed, setClosed] = useState(false);
	const [closing, setClosing] = useState(false);
	if (closed) return null;
	const warning = tone === "warn";
	return (
		<div
			role="alert"
			tabIndex={0}
			data-tone={tone}
			data-closing={closing || undefined}
			onAnimationEnd={() => closing && setClosed(true)}
			className={cn(
				"toast fixed right-4 bottom-4 z-50 w-105 max-w-[calc(100%-2rem)] overflow-hidden rounded-md border border-ink-1000 shadow-block outline-offset-4 sm:right-6 sm:bottom-6",
				styles.toast
			)}
		>
			<div className="p-4">
				<div
					className={cn(
						"-mx-4 -mt-4 mb-3 flex items-center justify-between gap-2 border-b px-4 py-2",
						styles.heading
					)}
				>
					<p className="font-display text-label font-semibold uppercase">
						{warning ? "Perlu perhatian" : "Terjadi kesalahan"}
					</p>
					<IconButton
						label="Tutup"
						className="size-6 hover:bg-(--toast-border) hover:text-(--toast-text)"
						onClick={() => setClosing(true)}
					>
						<X className="size-4" />
					</IconButton>
				</div>
				<p className="text-body-sm leading-relaxed wrap-break-word">{message}</p>
			</div>
		</div>
	);
}
