"use client";

import { Link } from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";

const NAV: { href: string; label: string; icon: IconName }[] = [
	{ href: "/", label: "Beranda", icon: "house" },
	{ href: "/cakupan", label: "Cakupan", icon: "layers" },
	{ href: "/statistik", label: "Statistik", icon: "trending-up" },
	{ href: "/referensi", label: "Referensi", icon: "book-open" }
];

const ITEM =
	"-mx-4 flex min-h-11 cursor-pointer items-center gap-3 border-r-3 px-4 font-display text-body-sm leading-none font-semibold";
const ACTIVE = "border-r-ink-1000 bg-nav-active text-ink-1000";
const IDLE = "border-r-transparent bg-transparent text-ink-500";

const isActive = (pathname: string, href: string) =>
	href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function Sidebar({
	shortcuts,
	onShortcuts
}: {
	/** The keyboard panel is open: it takes the active mark from the page. */
	shortcuts: boolean;
	onShortcuts: () => void;
}) {
	const pathname = usePathname();
	const link = (href: string, label: string, icon: IconName) => {
		const active = !shortcuts && isActive(pathname, href);
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
		<div className="w-58 flex-none border-r border-hairline bg-paper-0">
			<aside className="sticky top-0 flex h-dvh flex-col justify-between gap-8 px-4 py-5">
				<div className="flex flex-col gap-6">
					<Wordmark />
					<nav className="flex flex-col gap-0.5">
						{NAV.map((item) => link(item.href, item.label, item.icon))}
					</nav>
				</div>
				<div className="flex flex-col gap-0.5">
					<button
						type="button"
						onClick={onShortcuts}
						aria-pressed={shortcuts}
						className={`${ITEM} ${shortcuts ? ACTIVE : IDLE}`}
					>
						<Icon name="keyboard" />
						<span>Papan tombol</span>
					</button>
					{link("/setelan", "Setelan", "settings")}
				</div>
			</aside>
		</div>
	);
}
