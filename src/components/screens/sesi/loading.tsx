import { BarButton, SessionFrame, TopBar } from "@/components/shell/session-frame";
import { Skeleton, SkeletonText } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

function MetaSkeleton({ className }: { className: string }) {
	return (
		<div className={`${className} items-center justify-between gap-3`}>
			<Skeleton className="h-6 w-29 rounded-full" />
			<Skeleton className="h-4 w-12 rounded-xs" />
		</div>
	);
}

export function SessionLoading({ onExit }: { onExit: () => void }) {
	return (
		<SessionFrame
			bar={
				<TopBar>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 lg:gap-3">
							<BarButton
								icon="arrow-left"
								phoneIcon="x"
								large
								label="Keluar sesi"
								onClick={onExit}
							/>
							<Skeleton className="h-1.5 flex-1 rounded-xs" />
							<span className="min-w-10 text-right font-mono text-body-sm leading-none lg:hidden">
								<SkeletonText width="2.5em" />
							</span>
							<Skeleton className="h-2.5 w-7.5 rounded-xs max-lg:hidden" />
							<span className="inline-flex size-11 flex-none items-center justify-center lg:size-9">
								<Icon name="undo-2" size={null} className="size-5 lg:size-4.5" />
							</span>
						</div>
					</div>
					<MetaSkeleton className="hidden lg:flex lg:justify-start" />
				</TopBar>
			}
			meta={<MetaSkeleton className="flex" />}
		>
			{/* On a phone the line stands in for a title-size question. */}
			<div className="flex h-7.5 items-center lg:contents">
				<Skeleton className="block h-4.5 w-4/5 rounded-[3px] lg:h-5 lg:w-115.5 lg:max-w-full lg:rounded-xs" />
			</div>
			<div className="flex h-12 items-center rounded-sm border border-ink-1000 bg-paper-0 px-4 font-mono text-body-lg leading-none text-ink-500">
				Ketik jawaban…
			</div>
			<Skeleton className="block h-12 w-full rounded-sm" />
		</SessionFrame>
	);
}
