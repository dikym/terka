import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

const raisedButtonClasses = "border-ink-1000 shadow-block active:translate-0.5 active:shadow-none";

export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-sm border font-display leading-none font-semibold whitespace-nowrap transition duration-90 ease-out disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 motion-reduce:transition-none",
	{
		variants: {
			variant: {
				primary: cn(
					"bg-caution-500 text-ink-1000 hover:bg-caution-300",
					raisedButtonClasses
				),
				accent: cn(
					"bg-caution-300 text-ink-1000 hover:bg-caution-100",
					raisedButtonClasses
				),
				confirm: cn("bg-go-500 text-ink-1000 hover:bg-go-300", raisedButtonClasses),
				stop: cn("bg-stop-500 text-ink-1000 hover:bg-stop-300", raisedButtonClasses),
				ink: "border-ink-1000 bg-ink-1000 text-paper-25 shadow-block-accent hover:bg-ink-900 active:translate-0.5 active:shadow-none",
				secondary: cn("bg-paper-0 text-ink-1000 hover:bg-paper-50", raisedButtonClasses),
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
