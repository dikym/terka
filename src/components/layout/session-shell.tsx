"use client";
import { useSessionView } from "@/components/learning/session-view";
import Link from "next/link";
import { ArrowLeft, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionProgress } from "@/components/terka/session-progress";
import { IconButton } from "@/components/ui/icon-button";

export function SessionShell({
	current,
	total,
	back = "/",
	undo = true,
	toolbar,
	className,
	children
}: {
	current: number;
	total: number;
	back?: string;
	undo?: boolean;
	toolbar?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	const view = useSessionView();
	return (
		<div className="flex min-h-dvh flex-col bg-paper-0">
			<header className="flex flex-wrap items-center justify-between gap-5 border-b border-ink-200 bg-paper-0 px-6 py-4">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<Link
						href={back}
						aria-label="Keluar sesi"
						className="inline-flex size-control-sm items-center justify-center rounded-sm text-ink-700 hover:bg-paper-50"
					>
						<ArrowLeft className="size-4.5" aria-hidden />
					</Link>
					{view?.session.mode === "sprint" ? null : (
						<SessionProgress
							current={view?.current ?? current}
							total={view?.total ?? total}
							className="min-w-0 flex-1"
						/>
					)}
					{undo && (!view || view.canUndo) ? (
						<IconButton
							label="Batalkan jawaban"
							disabled={view?.busy}
							onClick={view?.undo}
						>
							<Undo2 className="size-4.5" aria-hidden />
						</IconButton>
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-3">{toolbar}</div>
			</header>
			<div className="flex flex-1 justify-center px-4 py-6 sm:px-8 sm:py-10">
				<div className={cn("flex w-full max-w-180 flex-col gap-5", className)}>
					{children}
				</div>
			</div>
		</div>
	);
}
