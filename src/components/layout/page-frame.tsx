import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageFrame({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-5 px-8 pt-8 pb-10", className)} {...props} />;
}

export function PageTitle({
	back,
	children,
	className
}: {
	back?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			{back ? (
				<Link
					href={back}
					aria-label="Kembali"
					className="size-control-sm text-ink-1000 hover:bg-paper-50 inline-flex items-center justify-center rounded-sm"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</Link>
			) : null}
			<h1 className="font-display text-title text-ink-1000 font-bold">{children}</h1>
		</div>
	);
}
