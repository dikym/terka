import { SessionFrame, TopBar } from "@/components/shell/session-frame";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { GROUP_BG } from "@/components/ui/groups";
import { Icon, type IconName } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { BACK_BUTTON } from "@/components/ui/page-title";
import { EmptyState } from "@/components/ui/states";
import { Tooltip } from "@/components/ui/tooltip";
import type { Preview } from "@/lib/session/preview";
import { LevelMark, levelName } from "./parts";

function Row({
	last,
	children,
	value,
	mono = true
}: {
	last?: boolean;
	children: React.ReactNode;
	value: string;
	mono?: boolean;
}) {
	return (
		<div
			className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-hairline"}`}
		>
			<div className="flex min-w-0 items-center gap-3">{children}</div>
			<span
				className={`flex-none text-ink-1000 tabular-nums ${mono ? "font-mono text-body-md leading-[1.2] font-medium" : "font-mono text-body-sm leading-[1.2] font-semibold"}`}
			>
				{value}
			</span>
		</div>
	);
}

function Right({ right }: { right: Preview["right"] }) {
	if (right.kind === "levels")
		return (
			<Card className="gap-1">
				<CardHeader label="Tingkat kesulitan" />
				<div className="flex flex-col">
					{([1, 2, 3] as const).map((level, index) => (
						<Row key={level} last={index === 2} value={String(right.values[index])}>
							<LevelMark level={level} className="w-11" />
							<span className="inline-flex items-center gap-2 text-ink-900 type-body">
								Level {level}
								<span className="text-ink-500">{levelName(level)}</span>
							</span>
						</Row>
					))}
				</div>
			</Card>
		);
	if (right.kind === "streak")
		return (
			<Card className="gap-4">
				<CardHeader
					label="Hari Beruntun"
					aside={<Icon name="flame" size={18} color="bg-tangerine-500" />}
				/>
				<div className="flex items-baseline gap-2">
					<span className="font-display text-heading leading-none font-bold">
						{right.days}
					</span>
					<span className="text-ink-900 type-body">hari</span>
				</div>
				<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
					{right.note}
				</p>
			</Card>
		);
	return (
		<Card className="gap-1">
			<CardHeader label="Aturan" />
			<div className="flex flex-col">
				{right.rows.map(([label, value], index) => (
					<Row
						key={label}
						last={index === right.rows.length - 1}
						value={value}
						mono={false}
					>
						<span className="text-ink-900 type-body">{label}</span>
					</Row>
				))}
			</div>
		</Card>
	);
}

export function PreviewBar({ onBack }: { onBack: () => void }) {
	return (
		<TopBar variant="preview" className="justify-between">
			<span className="inline-flex items-center gap-3">
				<Tooltip content="Kembali">
					<button
						type="button"
						aria-label="Kembali"
						onClick={onBack}
						className={`${BACK_BUTTON} max-lg:-ml-2.5 lg:size-9`}
					>
						<Icon name="arrow-left" size={null} className="size-5.5 lg:size-4.5" />
					</button>
				</Tooltip>
				<span className="font-display text-subhead leading-[1.2] font-semibold tracking-title lg:text-body-md">
					Pratinjau sesi
				</span>
			</span>
			<Kbd>Esc</Kbd>
		</TopBar>
	);
}

export function SessionPreview({
	preview: p,
	onBack,
	onStart
}: {
	preview: Preview;
	onBack: () => void;
	onStart: () => void;
}) {
	const total = p.composition?.reduce((sum, [, value]) => sum + value, 0) ?? 0;
	return (
		<SessionFrame variant="preview" bar={<PreviewBar onBack={onBack} />}>
			<div className="flex flex-col gap-2">
				<h1 className="flex items-center gap-3 type-screen-title">
					<Icon name={p.icon} size={28} color="bg-current" />
					<span>{p.title}</span>
				</h1>
				{p.scope && (
					<div className="flex items-center gap-2">
						<span
							className={`size-2.5 rounded-full ${p.scope.group === "national" ? "bg-ink-1000" : GROUP_BG[p.scope.group]}`}
						/>
						<span className="font-sans text-body-md leading-[1.2] font-medium text-ink-700">
							{p.scope.label}
						</span>
					</div>
				)}
				{p.facts && (
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
						{p.facts.map(([icon, label]) => (
							<span
								key={label}
								className="inline-flex items-center gap-1.5 font-sans text-body-sm leading-[1.3] text-ink-700"
							>
								<Icon name={icon} size={14} />
								{label}
							</span>
						))}
					</div>
				)}
				{p.description && (
					<p className="max-w-[62ch] text-pretty text-ink-900 type-body">
						{p.description}
					</p>
				)}
			</div>
			<div className="flex flex-col items-start gap-3 border-t border-b border-t-ink-1000 border-b-hairline py-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
				<div className="flex items-baseline gap-3">
					<span className="type-metric">{p.count}</span>
					<span className="font-display text-subhead leading-none font-semibold">
						{p.unit}
					</span>
				</div>
				<div className="flex flex-col items-start gap-1.5 lg:items-end lg:pb-2">
					<span className="type-label text-ink-500">{p.aside.label}</span>
					<span className="inline-flex items-center gap-2 font-display text-body-lg leading-[1.2] font-semibold text-ink-1000 lg:text-right">
						<Icon name={p.aside.icon} size={18} />
						{p.aside.value}
					</span>
				</div>
			</div>
			{p.composition && (
				<div className="flex flex-col gap-3">
					<div className="flex h-3.5 gap-[3px]">
						{p.composition.map(([label, value, color]) => (
							<span
								key={label}
								className={`rounded-[2px] ${color}`}
								style={{ flex: value / total }}
							/>
						))}
					</div>
					<div className="flex flex-wrap gap-x-6 gap-y-2">
						{p.composition.map(([label, value, color]) => (
							<span
								key={label}
								className="inline-flex items-center gap-2 text-ink-900 type-body"
							>
								<span className={`size-3 rounded-[2px] ${color}`} />
								{label}
								<b className="font-mono">{value}</b>
							</span>
						))}
					</div>
				</div>
			)}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card className="gap-1">
					<CardHeader label="Jenis soal" />
					<div className="flex flex-col">
						{p.types.map(([label, value], index) => (
							<Row key={label} last={index === p.types.length - 1} value={value}>
								<span className="inline-flex items-center gap-2 text-ink-900 type-body">
									{label}
								</span>
							</Row>
						))}
					</div>
				</Card>
				<Right right={p.right} />
			</div>
			{p.notes && (
				<div className="flex flex-col gap-2">
					<span className="type-label text-ink-500">Perlu diketahui</span>
					<div className="flex flex-col rounded-md border border-hairline bg-paper-0">
						{p.notes.map(([icon, count, text], index) => (
							<div
								key={text}
								className={`grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3 px-4 py-3 lg:items-center ${index ? "border-t border-hairline" : ""}`}
							>
								<Icon
									name={icon}
									size={18}
									color="bg-ink-700"
									className="mt-0.5 lg:mt-0"
								/>
								<span className="text-pretty text-ink-900 type-body">
									{count && (
										<span className="font-mono font-semibold text-ink-1000">
											{count}
										</span>
									)}
									{text}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
			<div className="mt-auto grid grid-cols-[120px_minmax(0,1fr)] gap-3 lg:mt-0 lg:grid-cols-[200px_minmax(0,1fr)]">
				<Button variant="secondary" block kbd="Esc" className="px-4" onClick={onBack}>
					Kembali
				</Button>
				<Button block icon="play" kbd="Enter" className="px-4" onClick={onStart}>
					{p.start}
				</Button>
				{p.skip && (
					// A client link to the same route with fewer params does not navigate here; load the page.
					<a
						href={p.skip.href}
						className={`${buttonClass("secondary", "md", true)} col-span-2 px-4`}
					>
						{p.skip.label}
					</a>
				)}
			</div>
		</SessionFrame>
	);
}

/** A mode with nothing to ask today: says why, with the way back. */
export function SessionEmpty({
	title,
	icon,
	message,
	detail,
	onBack
}: {
	title: string;
	icon: IconName;
	message: string;
	detail?: string;
	onBack: () => void;
}) {
	return (
		<SessionFrame variant="preview" bar={<PreviewBar onBack={onBack} />}>
			<h1 className="flex items-center gap-3 type-screen-title">
				<Icon name={icon} size={28} color="bg-current" />
				<span>{title}</span>
			</h1>
			<EmptyState label={title}>
				{message}
				{detail && ` ${detail}`}
			</EmptyState>
			<div className="mt-auto lg:mt-0">
				<Button variant="secondary" block kbd="Esc" className="px-4" onClick={onBack}>
					Kembali
				</Button>
			</div>
		</SessionFrame>
	);
}
