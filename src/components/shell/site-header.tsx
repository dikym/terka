import { Link } from "@/components/ui/app-link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/plate";

/** The page column of the public pages: the landing page and the sign-in page. */
export const SITE_WRAP = "container max-w-280 lg:px-5";

const NAV = [
	["Cara kerja", "#cara-kerja"],
	["Bentuk soal", "#bentuk-soal"],
	["Data", "#data"]
];

/** The top bar of the public pages. Off the landing page its section links lead back to it. */
export function SiteHeader({ home = false }: { home?: boolean }) {
	return (
		<header className="fixed inset-x-0 top-0 z-30 border-b border-hairline bg-paper-0">
			<div
				className={`${SITE_WRAP} flex min-h-15 items-center justify-between gap-3 py-2 lg:gap-4 lg:py-4`}
			>
				<Link href="/" aria-label="Terka">
					<Wordmark />
				</Link>
				<nav className="flex items-center gap-5">
					{NAV.map(([label, hash]) => (
						<a
							key={hash}
							href={home ? hash : `/${hash}`}
							className="font-display text-body-sm leading-none font-semibold text-ink-700 max-lg:hidden"
						>
							{label}
						</a>
					))}
					<Button href="/beranda" variant="secondary" size="sm" className="max-lg:h-11">
						Buka aplikasi
					</Button>
				</nav>
			</div>
		</header>
	);
}
