import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LabelText } from "./label-text";

export const inputVariants = cva(
	"w-full rounded-sm border border-ink-1000 bg-paper-0 font-body text-ink-1000 placeholder:text-ink-500 disabled:opacity-40",
	{
		variants: {
			size: { sm: "h-control-sm px-3 text-body-sm", md: "h-control px-4 text-body-md" }
		},
		defaultVariants: { size: "md" }
	}
);

export function Input({
	className,
	size,
	...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
	return <input className={cn(inputVariants({ size }), className)} {...props} />;
}

export function Field({
	label,
	hint,
	className,
	children
}: {
	label: React.ReactNode;
	hint?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<label className={cn("flex flex-col gap-2", className)}>
			<LabelText>{label}</LabelText>
			{children}
			{hint ? <span className="text-body-sm text-ink-500">{hint}</span> : null}
		</label>
	);
}
