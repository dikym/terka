import { Link } from "@/components/ui/app-link";
import { referenceHref } from "@/lib/view/reference";
import { GROUP_BORDER, type GroupId } from "./groups";

const SIZE = {
	xs: "h-5.5 w-7.5 border-b-2 text-micro",
	/** The phone map's chips: taller, and as wide as the code. */
	touch: "h-6.5 min-w-7.5 border-b-2 px-2 text-micro",
	sm: "h-7 w-10 border-b-3 text-body-sm",
	md: "h-9 w-13 border-b-3 text-body-lg",
	lg: "h-13 w-16 border-b-4 text-title"
};

const VERDICT = {
	correct: "border-go-500 bg-go-100",
	wrong: "border-stop-500 bg-stop-100"
};

export function CodeChip({
	code,
	group,
	size = "sm",
	unverified = false,
	verdict,
	className = ""
}: {
	code: string;
	group?: GroupId;
	size?: keyof typeof SIZE;
	/** Codes whose data is not fully verified sit on a yellow wash. */
	unverified?: boolean;
	verdict?: keyof typeof VERDICT;
	className?: string;
}) {
	const edge = verdict
		? VERDICT[verdict]
		: `${group ? GROUP_BORDER[group] : "border-ink-1000"} ${unverified ? "bg-caution-100" : "bg-paper-0"}`;
	return (
		<span
			className={`inline-flex flex-none items-center justify-center rounded-sm border font-plate leading-none font-bold tracking-plate whitespace-nowrap text-ink-1000 ${SIZE[size]} ${edge} ${className}`}
		>
			{code}
		</span>
	);
}

/** A chip that opens its code in Referensi. */
export function CodeLink({ className = "", ...props }: React.ComponentProps<typeof CodeChip>) {
	return (
		<Link
			href={referenceHref("kode", props.code)}
			aria-label={`Lihat ${props.code} di Referensi`}
			// w-fit: a grid cell would otherwise stretch the link past the chip, and its focus ring.
			className={`inline-flex w-fit flex-none ${className}`}
		>
			<CodeChip {...props} />
		</Link>
	);
}
