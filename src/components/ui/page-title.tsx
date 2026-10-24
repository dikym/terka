import { Link } from "@/components/ui/app-link";
import { Icon } from "./icon";

/** The back arrow beside a screen title; the keyboard panel uses it too. */
export const BACK_BUTTON =
	"inline-flex size-11 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-ink-700";

/** A screen title, optionally with the back arrow used by sub-screens. */
export function PageTitle({
	title,
	back,
	aside
}: {
	title: string;
	/** A path to link back to, or a handler. */
	back?: string | (() => void);
	aside?: React.ReactNode;
}) {
	const arrow = <Icon name="arrow-left" size={null} className="size-5.5 lg:size-6" />;
	// On a phone a sub-screen's title is its fixed top bar, in place of the app header.
	const bar = back
		? "fixed inset-x-0 top-0 z-30 min-h-15 border-b border-hairline bg-paper-0 px-4 py-2 lg:static lg:min-h-0 lg:border-0 lg:p-0"
		: "";
	return (
		<div
			data-topbar={back ? "" : undefined}
			className={`flex items-center justify-between gap-4 ${bar}`}
		>
			<div className="flex items-center gap-3">
				{typeof back === "string" && (
					<Link
						href={back}
						aria-label="Kembali"
						className={`${BACK_BUTTON} max-lg:-ml-2.5`}
					>
						{arrow}
					</Link>
				)}
				{typeof back === "function" && (
					<button
						type="button"
						onClick={back}
						aria-label="Kembali"
						className={`${BACK_BUTTON} max-lg:-ml-2.5`}
					>
						{arrow}
					</button>
				)}
				<h1
					className={
						back
							? "font-display text-subhead leading-[1.2] font-semibold tracking-title lg:type-screen-title"
							: "type-screen-title"
					}
				>
					{title}
				</h1>
			</div>
			{aside}
		</div>
	);
}
