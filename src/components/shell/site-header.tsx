import { Link } from "@/components/ui/app-link";
import { Wordmark } from "@/components/ui/plate";
import { SiteHeaderAction } from "@/components/shell/site-header-action";

const NAV = [
	["Cara kerja", "#cara-kerja"],
	["Bentuk soal", "#bentuk-soal"],
	["Data", "#data"]
];

/**
 * The top bar of the public pages. Off the landing page its section links lead back to it.
 * The button is Masuk until someone is signed in; the sign-in page always shows Buka aplikasi.
 */
export function SiteHeader({ home = false, signIn = true }: { home?: boolean; signIn?: boolean }) {
	return (
		<header className="fixed inset-x-0 top-0 z-30 h-15 border-b border-hairline bg-paper-0 lg:h-auto">
			<div className="container flex h-full items-center justify-between gap-3 lg:gap-4 lg:py-4">
				<Link href="/" aria-label="Terka">
					<Wordmark />
				</Link>
				<nav className="flex items-center gap-5">
					{NAV.map(([label, hash]) => (
						<a
							key={hash}
							href={home ? hash : `/${hash}`}
							className="font-display text-body-sm leading-none font-semibold text-ink-700 transition-colors duration-90 hover:text-ink-1000 max-lg:hidden"
						>
							{label}
						</a>
					))}
					<SiteHeaderAction signIn={signIn} />
				</nav>
			</div>
		</header>
	);
}
