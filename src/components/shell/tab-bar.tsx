"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/components/ui/app-link";
import { Icon } from "@/components/ui/icon";
import { isActive, NAV } from "./sidebar";

/** The phone's bottom navigation: the sidebar's four main tabs. */
export function TabBar() {
	const pathname = usePathname();
	return (
		<nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-hairline bg-paper-0 pb-[env(safe-area-inset-bottom)] lg:hidden">
			{NAV.map(({ href, label, icon }) => {
				const active = isActive(pathname, href);
				return (
					<Link
						key={href}
						href={href}
						aria-current={active ? "page" : undefined}
						// The 3 px top border sits over the bar's hairline.
						className={`-mt-px flex min-h-15 flex-col items-center justify-center gap-[5px] border-t-3 pt-2 pb-3 font-display text-micro leading-none font-semibold focus-visible:-outline-offset-2 ${active ? "border-t-ink-1000 bg-nav-active text-ink-1000" : "border-t-transparent text-ink-500"}`}
					>
						<Icon name={icon} />
						<span>{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
