import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

const shadowed =
	"border-ink-1000 shadow-block active:translate-[2px_2px] active:shadow-none disabled:active:translate-0 disabled:active:shadow-block";

export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-sm border font-display font-semibold whitespace-nowrap leading-none transition-[background-color,color,box-shadow,transform] duration-[90ms] ease-out disabled:cursor-not-allowed disabled:opacity-40",
	{
		variants: {
			variant: {
				primary: cn("bg-caution-500 text-ink-1000 hover:bg-caution-300", shadowed),
				accent: cn("bg-caution-300 text-ink-1000 hover:bg-caution-100", shadowed),
				confirm: cn("bg-go-500 text-ink-1000 hover:bg-go-300", shadowed),
				stop: cn("bg-stop-500 text-ink-1000 hover:bg-stop-300", shadowed),
				ink: "border-ink-1000 bg-ink-1000 text-paper-25 shadow-block-accent hover:bg-ink-900 active:translate-[2px_2px] active:shadow-none",
				secondary: cn("bg-paper-0 text-ink-1000 hover:bg-paper-50", shadowed),
				quiet: "border-ink-200 bg-paper-0 text-ink-900 hover:bg-paper-50",
				ghost: "border-transparent bg-transparent text-ink-700 hover:bg-paper-50 hover:text-ink-1000"
			},
			size: {
				sm: "h-control-sm px-3 text-body-sm",
				md: "h-control px-5 text-body-md",
				lg: "h-14 px-6 text-subhead"
			},
			block: { true: "flex w-full", false: "" }
		},
		defaultVariants: { variant: "primary", size: "md", block: false }
	}
);

export type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		kbd?: string;
		iconLeft?: React.ReactNode;
		iconRight?: React.ReactNode;
	};

export function Button({
	className,
	variant,
	size,
	block,
	kbd,
	iconLeft,
	iconRight,
	children,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(buttonVariants({ variant, size, block }), className)}
			{...props}
		>
			{iconLeft}
			<span>{children}</span>
			{iconRight}
			{kbd ? <Kbd className="ml-1">{kbd}</Kbd> : null}
		</button>
	);
}
