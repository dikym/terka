import { Icon } from "@/components/ui/icon";

export function SyncChip({ label }: { label: string | null }) {
	if (label === null)
		return (
			<span
				data-skeleton
				aria-hidden="true"
				className="inline-flex h-9 animate-skl items-center gap-2 rounded-sm border border-transparent bg-ink-100 px-3 text-transparent"
			>
				<span className="size-4 flex-none" />
				<span className="font-sans text-body-sm leading-none font-medium">
					Tersinkron 3 menit lalu
				</span>
			</span>
		);
	return (
		<span className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-200 px-3 text-ink-700">
			<Icon name="cloud-check" size={16} />
			<span className="font-sans text-body-sm leading-none font-medium">{label}</span>
		</span>
	);
}
