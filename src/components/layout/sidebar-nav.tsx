"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Keyboard, Layers, Settings, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const main = [
	{ href: "/", label: "Beranda", Icon: Target },
	{ href: "/cakupan", label: "Cakupan", Icon: Layers },
	{ href: "/statistik", label: "Statistik", Icon: TrendingUp },
	{ href: "/referensi", label: "Referensi", Icon: BookOpen }
];
const utility = [
	{ href: "/pintasan", label: "Papan tombol", Icon: Keyboard },
	{ href: "/setelan", label: "Setelan", Icon: Settings }
];

function Item({ href, label, Icon, active }: (typeof main)[number] & { active: boolean }) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"font-display text-body-sm hover:bg-paper-50 -mx-4 flex min-h-11 items-center gap-3 border-r-[3px] px-4 leading-none font-semibold",
				active
					? "border-ink-1000 bg-caution-100 text-ink-1000"
					: "text-ink-500 border-transparent"
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
	const items = group === "main" ? main : utility;
	return (
		<nav className="flex flex-col gap-0.5" aria-label={group === "main" ? "Utama" : "Lainnya"}>
			{items.map((i) => (
				<Item key={i.href} {...i} active={isActive(i.href)} />
			))}
		</nav>
	);
}
