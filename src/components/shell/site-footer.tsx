import { Icon, type IconName } from "@/components/ui/icon";
import { SITE_WRAP } from "./site-header";

const LINKS: { icon: IconName; label: string; href: string }[] = [
	{ icon: "info", label: "Tentang Terka", href: "/tentang" },
	{ icon: "shield-check", label: "Kebijakan privasi", href: "/privasi" },
	{ icon: "mail", label: "Laporkan data yang keliru", href: "mailto:contact@terka.my.id" }
];

/** The bottom bar of the public pages: the landing page, the about page and the privacy policy. */
export function SiteFooter() {
	return (
		<footer className="border-t border-hairline">
			<div
				className={`${SITE_WRAP} flex flex-col gap-5 pt-8 pb-10 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:py-8`}
			>
				<div className="flex flex-col items-start gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
					<span className="inline-flex items-center gap-[0.3em] rounded-sm border-2 border-ink-1000 px-2 py-0.75 font-plate text-body-lg leading-none font-bold tracking-wider text-ink-1000">
						T<span>3</span>
						<span>RKA</span>
					</span>
					<span className="text-body-sm leading-[1.4] text-ink-500">
						Dikembangkan mandiri.
					</span>
				</div>
				<nav className="flex flex-col lg:flex-row lg:flex-wrap lg:gap-5">
					{LINKS.map(({ icon, label, href }) => (
						<a
							key={href}
							href={href}
							className="flex min-h-12 items-center gap-3 border-t border-hairline text-body-md leading-none font-medium text-caution-700 hover:text-ink-1000 max-lg:last:border-b lg:min-h-0 lg:gap-2 lg:border-0 lg:text-body-sm"
						>
							<Icon
								name={icon}
								size={null}
								color="bg-current"
								className="size-4.5 lg:size-4"
							/>
							{label}
						</a>
					))}
				</nav>
			</div>
		</footer>
	);
}
