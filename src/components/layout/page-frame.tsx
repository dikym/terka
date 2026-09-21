import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageFrame({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-10 sm:px-8 sm:pt-8",
				className
			)}
			{...props}
		/>
	);
}

export function PageTitle({
	back,
	size = "lg",
	actions,
	children,
	className
}: {
	back?: string;
	size?: "lg" | "sm";
	actions?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-wrap items-center gap-3", className)}>
			{back ? (
				<Link
					href={back}
					aria-label="Kembali"
					className="inline-flex size-control-sm items-center justify-center rounded-sm text-ink-700 hover:bg-paper-50"
				>
					<ArrowLeft className="size-4.5" aria-hidden />
				</Link>
			) : null}
			<h1
				className={cn(
					"font-display text-ink-1000",
					size === "sm" ? "text-subhead font-semibold" : "text-title font-bold"
				)}
			>
				{children}
			</h1>
			{actions ? <span className="ml-auto flex items-center gap-3">{actions}</span> : null}
		</div>
	);
}
