import { Link } from "@/components/ui/app-link";
import { BusyDots } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";

const VARIANT = {
	primary: "border-ink-1000 bg-caution-500 text-ink-1000 shadow-block",
	accent: "border-ink-1000 bg-caution-300 text-ink-1000 shadow-block",
	confirm: "border-ink-1000 bg-go-500 text-ink-1000 shadow-block",
	stop: "border-ink-1000 bg-stop-500 text-ink-1000 shadow-block",
	ink: "border-ink-1000 bg-ink-1000 text-paper-25 shadow-block-accent",
	secondary: "border-ink-1000 bg-paper-0 text-ink-1000 shadow-block",
	outline: "border-ink-1000 bg-paper-0 text-ink-1000",
	quiet: "border-hairline bg-paper-0 text-ink-900",
	ghost: "border-transparent bg-transparent text-ink-700"
};

const SIZE = {
	sm: "h-9 px-4 text-body-sm",
	md: "h-12 px-5 text-body-md",
	lg: "h-14 px-6 text-subhead"
};

type Variant = keyof typeof VARIANT;

type ButtonProps = {
	children: React.ReactNode;
	variant?: Variant;
	size?: keyof typeof SIZE;
	block?: boolean;
	icon?: IconName;
	kbd?: string;
	href?: string;
	/** A slow action is running: the button ignores presses and says so with `busyLabel`. */
	loading?: boolean;
	/** What is happening, without the dots. */
	busyLabel?: string;
	className?: string;
	onClick?: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "onClick">;

export function buttonClass(variant: Variant, size: keyof typeof SIZE, block: boolean) {
	const pressable = !["quiet", "ghost", "outline"].includes(variant);
	return [
		block ? "flex w-full" : "inline-flex",
		"items-center justify-center gap-2 rounded-sm border font-display leading-none font-semibold whitespace-nowrap",
		"transition-[background-color,color,box-shadow,translate] duration-90 ease-out",
		"cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 aria-busy:cursor-not-allowed aria-busy:opacity-40",
		// `not-disabled`, not `enabled`: `:enabled` never matches the links this renders as.
		pressable
			? "not-disabled:not-aria-busy:active:translate-0.5 not-disabled:not-aria-busy:active:shadow-none"
			: "",
		// The focus outline would run into the offset shadow, so the shadow steps aside for it.
		pressable ? "not-aria-busy:focus-visible:shadow-none" : "",
		VARIANT[variant],
		SIZE[size]
	].join(" ");
}

export function Button({
	children,
	variant = "primary",
	size = "md",
	block = false,
	icon,
	kbd,
	href,
	loading = false,
	busyLabel,
	disabled = false,
	className = "",
	type = "button",
	onClick,
	...rest
}: ButtonProps) {
	const label = (
		<>
			{icon && <Icon name={icon} size={size === "lg" ? 18 : 16} />}
			<span>{children}</span>
			{kbd && (
				<Kbd variant="inline" className="ml-1">
					{kbd}
				</Kbd>
			)}
		</>
	);
	const content =
		loading && busyLabel !== undefined ? (
			<span>
				{busyLabel}
				<BusyDots />
			</span>
		) : (
			label
		);
	const classes = `${buttonClass(variant, size, block)} ${className}`;
	// A link cannot be disabled, so a disabled target renders as a disabled button.
	if (href && !disabled && !loading)
		return (
			<Link href={href} className={classes} onClick={onClick}>
				{content}
			</Link>
		);
	return (
		// `disabled` would drop keyboard focus for the whole wait, and an emptied dialog would lose its
		// focus trap, so a busy button stays focusable and ignores presses, Enter in a form included.
		<button
			type={type}
			className={classes}
			onClick={loading ? (event) => event.preventDefault() : onClick}
			disabled={disabled && !loading}
			{...rest}
			aria-busy={loading || undefined}
			aria-disabled={loading || rest["aria-disabled"]}
		>
			{content}
		</button>
	);
}
