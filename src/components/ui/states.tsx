import { Button } from "./button";

/** One muted sentence where content would be; no illustration and no call to practise more. */
export function EmptyState({ label, children }: { label?: string; children: React.ReactNode }) {
	return (
		<section className="rounded-md border border-hairline bg-paper-0 shadow-lift">
			<div className="flex flex-col gap-3 p-4">
				{label && <span className="type-label text-ink-500">{label}</span>}
				<p className="m-0 text-pretty text-ink-500 type-body">{children}</p>
			</div>
		</section>
	);
}

/** A road barrier: the screen cannot be used. */
function Barrier() {
	return (
		<div aria-hidden="true" className="flex w-70 flex-col items-center max-lg:scale-75">
			<div className="h-11 w-70 rounded-sm border-2 border-ink-1000 bg-[repeating-linear-gradient(-45deg,var(--color-caution-500)_0_22px,var(--color-ink-1000)_22px_44px)]" />
			<div className="flex w-50 justify-between">
				<span className="h-14 w-2.5 bg-ink-1000" />
				<span className="h-14 w-2.5 bg-ink-1000" />
			</div>
			<div className="flex w-60 justify-between">
				<span className="h-2 w-12.5 rounded-xs bg-ink-1000" />
				<span className="h-2 w-12.5 rounded-xs bg-ink-1000" />
			</div>
		</div>
	);
}

/** In place of a whole screen that failed; a failure of one part uses a toast instead. */
export function ErrorState({
	children,
	onRetry = () => location.reload()
}: {
	children: React.ReactNode;
	onRetry?: () => void;
}) {
	return (
		<div className="flex flex-1 items-center justify-center px-2 py-10 lg:px-8">
			<div role="alert" className="flex max-w-130 flex-col items-center gap-8 text-center">
				<Barrier />
				<div className="flex flex-col items-center gap-3">
					<span className="type-label text-stop-700">Terjadi kesalahan</span>
					<h2 className="m-0 font-display text-title leading-[1.2] font-bold tracking-title text-balance">
						{children}
					</h2>
				</div>
				<Button icon="rotate-ccw" className="px-6" onClick={onRetry}>
					Muat ulang
				</Button>
			</div>
		</div>
	);
}
