"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Keyboard, Layers, Settings, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const mainNavItems = [
	{ href: "/", label: "Beranda", Icon: Target },
	{ href: "/cakupan", label: "Cakupan", Icon: Layers },
	{ href: "/statistik", label: "Statistik", Icon: TrendingUp },
	{ href: "/referensi", label: "Referensi", Icon: BookOpen }
];
const utilityNavItems = [
	{ href: "/pintasan", label: "Papan tombol", Icon: Keyboard },
	{ href: "/setelan", label: "Setelan", Icon: Settings }
];

function NavItem({
	href,
	label,
	Icon,
	active
}: (typeof mainNavItems)[number] & { active: boolean }) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"-mx-4 flex min-h-11 items-center gap-3 border-r-3 px-4 font-display text-body-sm leading-none font-semibold hover:bg-paper-50",
				active
					? "border-ink-1000 bg-caution-100 text-ink-1000"
					: "border-transparent text-ink-500"
			)}
		>
			<Icon className="size-5 shrink-0" aria-hidden />
			{label}
		</Link>
	);
}

export function SidebarNav({ group }: { group: "main" | "utility" }) {
	const pathname = usePathname();
	const isActive = (href: string) =>
		href === "/" ? pathname === "/" : pathname.startsWith(href);
	const items = group === "main" ? mainNavItems : utilityNavItems;
	return (
		<nav
			className="flex flex-wrap gap-x-8 gap-y-0.5 md:flex-col md:gap-0.5"
			aria-label={group === "main" ? "Utama" : "Lainnya"}
		>
			{items.map((item) => (
				<NavItem key={item.href} {...item} active={isActive(item.href)} />
			))}
		</nav>
	);
}
