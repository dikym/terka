"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/components/ui/app-link";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";
import { useReady, useSyncLabel } from "@/lib/app/use-runtime";

const ICON_BUTTON =
	"inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-ink-700 focus-visible:-outline-offset-2";

/** Screens whose desktop version shows the sync chip beside the date or title. */
const SYNC_SCREENS = ["/", "/statistik"];

/**
 * The phone's top bar on the main tabs. A sub-screen draws its own back-arrow
 * bar instead, marked `data-topbar`, which hides this one.
 */
export function MobileHeader() {
	const pathname = usePathname();
	const label = useSyncLabel(useReady().runtime) ?? "";
	return (
		<header className="fixed inset-x-0 top-0 z-30 flex min-h-15 items-center justify-between gap-3 border-b border-hairline bg-paper-0 px-4 py-2 group-has-[[data-topbar]]:hidden lg:hidden">
			<Wordmark />
			<span className="-mr-2.5 inline-flex items-center">
				{SYNC_SCREENS.includes(pathname) && (
					<button type="button" aria-label={label} title={label} className={ICON_BUTTON}>
						<Icon name="cloud-check" />
					</button>
				)}
				<Link href="/setelan" aria-label="Setelan" title="Setelan" className={ICON_BUTTON}>
					<Icon name="settings" />
				</Link>
			</span>
		</header>
	);
}
