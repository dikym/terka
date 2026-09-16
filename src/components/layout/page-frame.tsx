import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageFrame({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-5 px-8 pt-8 pb-10", className)} {...props} />;
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
		<div className={cn("flex items-center gap-3", className)}>
			{back ? (
				<Link
					href={back}
					aria-label="Kembali"
					className="size-control-sm text-ink-700 hover:bg-paper-50 inline-flex items-center justify-center rounded-sm"
				>
					<ArrowLeft className="size-[18px]" aria-hidden />
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
