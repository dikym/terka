// Phones have no keyboard, so the hints stay off below `lg`; the full key caps stay.
const VARIANT = {
	inline: "max-lg:hidden rounded-xs border border-current px-[5px] py-[3px] font-mono text-micro leading-none font-medium opacity-60",
	key: "max-lg:hidden inline-flex h-5.5 min-w-5.5 flex-none items-center justify-center rounded-xs border border-ink-300 bg-paper-0 px-1.5 font-mono text-micro leading-none font-medium text-ink-900",
	cap: "inline-flex h-8 min-w-8 items-center justify-center rounded-xs border border-ink-1000 bg-paper-0 px-2 font-mono text-body-md leading-none font-medium text-ink-1000 shadow-[0_2px_0_var(--color-ink-1000)]"
};

export function Kbd({
	children,
	variant = "key",
	className = ""
}: {
	children: React.ReactNode;
	variant?: keyof typeof VARIANT;
	className?: string;
}) {
	return <kbd className={`${VARIANT[variant]} ${className}`}>{children}</kbd>;
}
