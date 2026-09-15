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
	return (
		<div className="bg-paper-0 flex min-h-dvh flex-col">
			<header className="border-ink-200 bg-paper-0 flex items-center justify-between gap-5 border-b px-6 py-4">
				<div className="flex items-center gap-3">
					<Link
						href={back}
						aria-label="Keluar sesi"
						className="size-control-sm text-ink-1000 hover:bg-paper-50 inline-flex items-center justify-center rounded-sm"
					>
						<ArrowLeft className="size-5" aria-hidden />
					</Link>
					<SessionProgress current={current} total={total} />
					{undo ? (
						<IconButton label="Batalkan jawaban">
							<Undo2 className="size-5" aria-hidden />
						</IconButton>
					) : null}
				</div>
				<div className="flex items-center gap-3">{toolbar}</div>
			</header>
			<div className="flex flex-1 justify-center px-8 py-10">
				<div className={cn("flex w-full max-w-[720px] flex-col gap-5", className)}>
					{children}
				</div>
			</div>
		</div>
	);
}
