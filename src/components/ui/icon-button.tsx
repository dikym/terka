import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-sm border text-ink-1000 transition-[background-color,box-shadow,transform] duration-[90ms] ease-out disabled:cursor-not-allowed disabled:opacity-40",
	{
		variants: {
			variant: {
				ghost: "border-transparent bg-transparent hover:bg-paper-50",
				outline:
					"border-ink-1000 bg-paper-0 shadow-block hover:bg-paper-50 active:translate-[2px_2px] active:shadow-none"
			},
			size: { sm: "size-control-sm", md: "size-control" }
		},
		defaultVariants: { variant: "ghost", size: "sm" }
	}
);

export function IconButton({
	className,
	variant,
	size,
	label,
	type = "button",
	...props
}: React.ComponentProps<"button"> & VariantProps<typeof iconButtonVariants> & { label: string }) {
	return (
		<button
			type={type}
			aria-label={label}
			className={cn(iconButtonVariants({ variant, size }), className)}
			{...props}
		/>
	);
}
