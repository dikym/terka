import { Icon } from "@/components/ui/icon";
import { useReady, useSyncIcon } from "@/lib/app/use-runtime";

/** Desktop only: on a phone the sync status is an icon in the top bar. */
export function SyncChip({ label }: { label: string | null }) {
	const icon = useSyncIcon(useReady().runtime);
	if (label === null)
		return (
			<span
				data-skeleton
				aria-hidden="true"
				className="hidden h-9 animate-skl items-center gap-2 rounded-sm border border-transparent bg-ink-100 px-3 text-transparent lg:inline-flex"
			>
				<span className="size-4 flex-none" />
				<span className="font-sans text-body-sm leading-none font-medium">
					Tersinkron 3 menit lalu
				</span>
			</span>
		);
	return (
		<span className="hidden h-9 items-center gap-2 rounded-sm border border-ink-200 px-3 text-ink-700 lg:inline-flex">
			<Icon name={icon} size={16} />
			<span className="font-sans text-body-sm leading-none font-medium">{label}</span>
		</span>
	);
}
