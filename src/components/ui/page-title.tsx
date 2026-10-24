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
	const arrow = <Icon name="arrow-left" size={24} />;
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-3">
				{typeof back === "string" && (
					<Link href={back} aria-label="Kembali" className={BACK_BUTTON}>
						{arrow}
					</Link>
				)}
				{typeof back === "function" && (
					<button
						type="button"
						onClick={back}
						aria-label="Kembali"
						className={BACK_BUTTON}
					>
						{arrow}
					</button>
				)}
				<h1 className="type-screen-title">{title}</h1>
			</div>
			{aside}
		</div>
	);
}
