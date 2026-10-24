import { Icon } from "@/components/ui/icon";
import type { Level } from "@/dummy/session";

const LEVEL = {
	1: { icon: "eye", name: "Kenali" },
	2: { icon: "brain", name: "Ingat" },
	3: { icon: "medal", name: "Kuasai" }
} as const;

export const levelName = (level: Level) => LEVEL[level].name;

/** Three squares filled up to the level, then the level's icon. */
export function LevelMark({ level, className = "" }: { level: Level; className?: string }) {
	const label = `Level ${level} ${LEVEL[level].name}`;
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={`inline-flex flex-none items-center gap-2 ${className}`}
		>
			<span className="inline-flex gap-[3px]">
				{[1, 2, 3].map((step) => (
					<span
						key={step}
						className={`size-1.5 flex-none rounded-[1px] ${step <= level ? "bg-ink-1000" : "bg-ink-200"}`}
					/>
				))}
			</span>
			<Icon name={LEVEL[level].icon} size={16} color="bg-ink-700" />
		</span>
	);
}

const PILL_TONE = {
	caution: "bg-caution-100 text-ink-1000",
	fresh: "bg-go-100 text-ink-1000",
	go: "bg-go-100 text-go-700",
	grape: "bg-grape-100 text-grape-700",
	stop: "bg-stop-100 text-stop-700",
	muted: "bg-paper-50 text-ink-700"
};

export function StatusPill({
	tone,
	children,
	className = ""
}: {
	tone: keyof typeof PILL_TONE;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex w-fit items-center gap-2 self-start rounded-full border border-transparent px-2.5 py-1 type-label whitespace-nowrap ${PILL_TONE[tone]} ${className}`}
		>
			<span className="size-[7px] flex-none rounded-full bg-current" />
			{children}
		</span>
	);
}
