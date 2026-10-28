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

/**
 * The top bar of the public pages. Off the landing page its section links lead back to it.
 * The sign-in page hides its own button.
 */
export function SiteHeader({ home = false, signIn = true }: { home?: boolean; signIn?: boolean }) {
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
							className="font-display text-body-sm leading-none font-semibold text-ink-700 hover:text-ink-1000 max-lg:hidden"
						>
							{label}
						</a>
					))}
					<div className="flex items-center gap-2 lg:gap-3">
						{signIn && (
							<Button href="/masuk" variant="outline" size="sm">
								Masuk
							</Button>
						)}
						<Button href="/beranda" size="sm">
							Buka aplikasi
						</Button>
					</div>
				</nav>
			</div>
		</header>
	);
}
