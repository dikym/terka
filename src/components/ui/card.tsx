import { cn } from "@/lib/utils";

export type AccentToken =
	| "sumatera"
	| "jawa"
	| "kalimantan"
	| "sulawesi"
	| "balinusra"
	| "maluku"
	| "papua"
	| "grape"
	| "brand"
	| "success"
	| "danger"
	| "warn"
	| "ink";

const accentClass: Record<AccentToken, string> = {
	sumatera: "bg-group-sumatera",
	jawa: "bg-group-jawa",
	kalimantan: "bg-group-kalimantan",
	sulawesi: "bg-group-sulawesi",
	balinusra: "bg-group-balinusra",
	maluku: "bg-group-maluku",
	papua: "bg-group-papua",
	grape: "bg-grape-500",
	brand: "bg-caution-500",
	success: "bg-go-500",
	danger: "bg-stop-500",
	warn: "bg-caution-500",
	ink: "bg-ink-1000"
};

export function Card({
	className,
	accent,
	children,
	...props
}: React.ComponentProps<"section"> & { accent?: AccentToken }) {
	return (
		<section
			className={cn(
				"border-ink-200 bg-paper-0 shadow-lift overflow-hidden rounded-md border",
				className
			)}
			{...props}
		>
			{accent ? <div className={cn("h-1 w-full", accentClass[accent])} aria-hidden /> : null}
			{children}
		</section>
	);
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex items-start justify-between gap-3 px-4 pt-4", className)}
			{...props}
		/>
	);
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<h2
			className={cn("font-display text-subhead text-ink-1000 font-semibold", className)}
			{...props}
		/>
	);
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-3 p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("border-ink-200 flex items-center gap-3 border-t px-4 py-3", className)}
			{...props}
		/>
	);
}
