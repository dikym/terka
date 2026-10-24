export function Card({
	bar,
	className = "gap-4",
	children
}: {
	/** A `bg-*` class for the 4 px classification bar across the top. */
	bar?: string;
	/** Classes for the padded body, usually its `gap-*`. */
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="min-w-0 overflow-hidden rounded-md border border-hairline bg-paper-0 shadow-lift">
			{bar && <div className={`h-1 ${bar}`} />}
			<div className={`flex flex-col p-4 ${className}`}>{children}</div>
		</section>
	);
}

export function CardHeader({
	label,
	title,
	aside
}: {
	label: React.ReactNode;
	title?: React.ReactNode;
	aside?: React.ReactNode;
}) {
	return (
		<header className="flex items-start justify-between gap-3">
			<div className="flex min-w-0 flex-col gap-1">
				<span className="type-label text-ink-500">{label}</span>
				{title && <h3 className="tracking-title type-card-title">{title}</h3>}
			</div>
			{aside}
		</header>
	);
}

export function Label({
	children,
	className = "text-ink-500"
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <span className={`type-label ${className}`}>{children}</span>;
}
