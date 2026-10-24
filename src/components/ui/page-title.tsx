import { Link } from "@/components/ui/app-link";
import { Icon } from "./icon";

const BACK =
	"-ml-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent";

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
	const arrow = <Icon name="arrow-left" size={22} />;
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-3">
				{typeof back === "string" && (
					<Link href={back} aria-label="Kembali" className={BACK}>
						{arrow}
					</Link>
				)}
				{typeof back === "function" && (
					<button type="button" onClick={back} aria-label="Kembali" className={BACK}>
						{arrow}
					</button>
				)}
				<h1 className="type-screen-title">{title}</h1>
			</div>
			{aside}
		</div>
	);
}
