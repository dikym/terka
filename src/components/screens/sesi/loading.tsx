import { SessionFrame, TopBar } from "@/components/shell/session-frame";
import { Skeleton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

export function SessionLoading({ onExit }: { onExit: () => void }) {
	return (
		<SessionFrame
			bar={
				<TopBar>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-3">
							<button
								type="button"
								aria-label="Keluar sesi"
								onClick={onExit}
								className="inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-sm text-ink-700"
							>
								<Icon name="arrow-left" size={18} />
							</button>
							<Skeleton className="h-1.5 flex-1 rounded-xs" />
							<Skeleton className="h-2.5 w-7.5 rounded-xs" />
							<span className="inline-flex size-9 flex-none items-center justify-center">
								<Icon name="undo-2" size={18} />
							</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-6 w-29 rounded-full" />
						<Skeleton className="h-4 w-12 rounded-xs" />
					</div>
				</TopBar>
			}
		>
			<Skeleton className="block h-5 w-[462px] max-w-full rounded-xs" />
			<div className="flex h-12 items-center rounded-sm border border-ink-1000 bg-paper-0 px-4 font-mono text-body-lg leading-none text-ink-500">
				Ketik jawaban…
			</div>
			<Skeleton className="block h-12 w-full rounded-sm" />
		</SessionFrame>
	);
}
