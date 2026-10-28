"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";
import { Tooltip } from "@/components/ui/tooltip";
import { useReady, useSyncIcon, useSyncLabel } from "@/lib/app/use-runtime";
import { AccountMenu } from "./account-menu";

const ICON_BUTTON =
	"inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-ink-700 focus-visible:-outline-offset-2";

/** Screens whose desktop version shows the sync chip beside the date or title. */
const SYNC_SCREENS = ["/beranda", "/statistik"];

/**
 * The phone's top bar on the main tabs. A sub-screen draws its own back-arrow
 * bar instead, marked `data-topbar`, which hides this one.
 */
export function MobileHeader() {
	const pathname = usePathname();
	const { runtime } = useReady();
	const label = useSyncLabel(runtime) ?? "";
	const icon = useSyncIcon(runtime);
	return (
		<header className="fixed inset-x-0 top-0 z-30 flex min-h-15 items-center justify-between gap-3 border-b border-hairline bg-paper-0 px-4 py-2 group-has-[[data-topbar]]:hidden lg:hidden">
			<Wordmark />
			<span className="-mr-2.5 inline-flex items-center">
				{SYNC_SCREENS.includes(pathname) && (
					<Tooltip content={label}>
						<button type="button" aria-label={label} className={ICON_BUTTON}>
							<Icon name={icon} />
						</button>
					</Tooltip>
				)}
				<AccountMenu
					iconOnly
					triggerClassName={ICON_BUTTON}
					menuClassName="top-[calc(100%+12px)] right-2.5 max-h-[calc(100dvh-5rem)] w-56 max-w-[calc(100vw-2rem)]"
				/>
			</span>
		</header>
	);
}
