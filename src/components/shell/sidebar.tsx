"use client";

import { Link } from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";
import { AccountMenu } from "./account-menu";

export const NAV: { href: string; label: string; icon: IconName }[] = [
	{ href: "/beranda", label: "Beranda", icon: "house" },
	{ href: "/cakupan", label: "Cakupan", icon: "layers" },
	{ href: "/statistik", label: "Statistik", icon: "trending-up" },
	{ href: "/referensi", label: "Referensi", icon: "book-open" }
];

// The ring sits inside the item: items bleed to the sidebar edge, so an outer ring would be clipped.
const ITEM =
	"-mx-4 flex min-h-11 cursor-pointer items-center gap-3 border-r-3 px-4 font-display text-body-sm leading-none font-semibold focus-visible:-outline-offset-2";
const ACTIVE = "border-r-ink-1000 bg-nav-active text-ink-1000";
const IDLE = "border-r-transparent bg-transparent text-ink-500";

export const isActive = (pathname: string, href: string) =>
	pathname === href || pathname.startsWith(`${href}/`);

// Setelan and Papan tombol open from the account menu, which stands for them while one is open.
const ACCOUNT_PATHS = ["/setelan", "/papan-tombol"];

export function Sidebar() {
	const pathname = usePathname();
	const accountActive = ACCOUNT_PATHS.some((href) => isActive(pathname, href));
	const link = (href: string, label: string, icon: IconName) => {
		const active = isActive(pathname, href);
		return (
			<Link
				key={href}
				href={href}
				aria-current={active ? "page" : undefined}
				className={`${ITEM} ${active ? ACTIVE : IDLE}`}
			>
				<Icon name={icon} />
				<span>{label}</span>
			</Link>
		);
	};
	return (
		// Holds the sidebar's width in the layout; the sidebar itself, border included, is fixed.
		<div className="hidden w-58 flex-none lg:block">
			<aside className="fixed top-0 flex h-dvh w-58 flex-col justify-between gap-8 border-r border-hairline bg-paper-0 px-4 py-5">
				<div className="flex flex-col gap-6">
					<Wordmark />
					<nav className="flex flex-col gap-0.5">
						{NAV.map((item) => link(item.href, item.label, item.icon))}
					</nav>
				</div>
				<AccountMenu
					triggerClassName={`${ITEM} w-[calc(100%+2rem)] text-left aria-expanded:bg-nav-active aria-expanded:text-ink-1000 ${accountActive ? ACTIVE : IDLE}`}
					menuClassName="bottom-[calc(100%+8px)] -inset-x-3"
				/>
			</aside>
		</div>
	);
}
