import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Callout } from "@/components/ui/feedback";
import { GROUP_BG } from "@/components/ui/groups";
import { Flag, Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Plate } from "@/components/ui/plate";
import { type DummyCard, QUEUES } from "@/dummy/session";
import { cardLevel, cardOptions, type SessionState } from "@/dummy/session-reducer";
import { LevelMark, levelName, StatusPill } from "./parts";

const KEYS = ["F", "G", "H", "J"];
export const ANSWER_INPUT = "jawaban";

type Props = {
	state: SessionState;
	card: DummyCard;
	onInput: (value: string) => void;
	onSubmit: () => void;
	onChoose: (option: string) => void;
	onNext: () => void;
	onLower: () => void;
	onRestore: () => void;
	onAdd: () => void;
	onRemove: (value: string) => void;
	onDismissNote: () => void;
	countdown: number | null;
};

function QuestionPlate({ card }: { card: DummyCard }) {
	if (!card.plate) return null;
	const [code, number, suffix] = card.plate;
	// A diplomat plate is read as one code: both parts carry the highlight.
	if (card.form === "tebakDiplomat")
		return <Plate code={`${code} ${number}`} highlight="code" className="self-start" />;
	return (
		<Plate
			code={code}
			number={number}
			suffix={suffix}
			highlight={card.form === "perkenalan" ? undefined : "code"}
			className="self-start"
		/>
	);
}

function Title({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="font-display text-title leading-[1.15] font-bold tracking-title text-pretty">
			{children}
		</h2>
	);
}

function Countdown({
	seconds,
	total,
	tone,
	className = "flex"
}: {
	seconds: number;
	total: number;
	tone: "caution" | "stop";
	className?: string;
}) {
	const fraction = Math.max(0, seconds / total);
	const label =
		total <= 5
			? `${seconds.toFixed(1).replace(".", ",")} detik`
			: `${Math.ceil(seconds)} detik`;
	return (
		<div className={`${className} w-full items-center gap-3`}>
			<Icon name="clock" size={16} />
			<div className="h-1.5 flex-1 overflow-hidden rounded-xs bg-ink-100">
				<div
					className={`h-full ${tone === "stop" ? "bg-stop-500" : "bg-caution-500"}`}
					style={{ width: `${fraction * 100}%` }}
				/>
			</div>
			<span className="flex-none font-mono text-body-lg leading-none font-bold text-ink-1000 tabular-nums">
				{label}
			</span>
		</div>
	);
}

function AnswerBox({
	state,
	card,
	onInput,
	mono
}: {
	state: SessionState;
	card: DummyCard;
	onInput: (value: string) => void;
	mono: boolean;
}) {
	const graded = state.phase === "graded";
	const tone = !graded
		? "border border-ink-1000 bg-paper-0"
		: state.verdict === "right"
			? "border-2 border-go-500 bg-go-100"
			: "border-2 border-stop-500 bg-stop-100";
	return (
		<label className="flex flex-col gap-2">
			<span className="sr-only">Jawaban</span>
			<input
				id={ANSWER_INPUT}
				value={state.input}
				onChange={(event) => onInput(event.target.value)}
				readOnly={graded}
				autoFocus
				autoComplete="off"
				spellCheck={false}
				placeholder="Ketik jawaban…"
				className={`h-12 w-full rounded-sm px-4 text-body-lg leading-none text-ink-1000 outline-none placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1000 ${mono ? "font-mono" : "font-sans"} ${tone}`}
			/>
			{graded && state.verdict === "right" && card.graded?.aliasNote && (
				<span className="font-sans text-body-sm leading-[1.4] text-ink-500">
					{card.graded.aliasNote}
				</span>
			)}
		</label>
	);
}

function Verdict({ state, card }: { state: SessionState; card: DummyCard }) {
	if (state.verdict === "right")
		return (
			<div className="flex items-center justify-between gap-3">
				<StatusPill tone="go">Benar</StatusPill>
				{card.graded?.review && (
					<span className="font-mono text-body-sm leading-none font-medium text-ink-500">
						{card.graded.review}
					</span>
				)}
			</div>
		);
	return (
		<div className="flex items-center gap-3">
			<StatusPill tone="stop">{state.timedOut ? "Waktu habis" : "Belum tepat"}</StatusPill>
			{card.flag ? (
				<span className="inline-flex items-center gap-2 font-display text-body-md leading-none font-semibold text-ink-1000">
					Jawaban:
					<Flag code={card.flag} />
					{card.answer}
				</span>
			) : (
				<span className="font-display text-body-md leading-none font-semibold text-ink-1000">
					Jawaban: {card.answer}
				</span>
			)}
		</div>
	);
}

function ChoiceGrid({
	state,
	card,
	options,
	onChoose
}: {
	state: SessionState;
	card: DummyCard;
	options: string[];
	onChoose: (option: string) => void;
}) {
	const graded = state.phase === "graded";
	return (
		// Four choices stack on a phone; a pair stays side by side.
		<div
			className={`grid gap-3 ${options.length === 2 ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}
		>
			{options.map((option, index) => {
				const tone = !graded
					? "border-ink-1000 bg-paper-0"
					: option === card.answer
						? "border-go-500 bg-go-100"
						: option === state.chosen
							? "border-stop-500 bg-stop-100"
							: "border-hairline bg-paper-0";
				return (
					<button
						key={option}
						type="button"
						disabled={graded}
						aria-keyshortcuts={KEYS[index]}
						onClick={() => onChoose(option)}
						className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border px-4 text-left font-sans text-body-lg leading-[1.2] font-medium text-ink-1000 disabled:cursor-default ${tone}`}
					>
						<Kbd>{options.length === 2 ? (index ? "J" : "F") : KEYS[index]}</Kbd>
						{card.choiceGroups && (
							<span
								className={`size-2.5 flex-none rounded-full ${GROUP_BG[card.choiceGroups[index]]}`}
							/>
						)}
						<span>{option}</span>
					</button>
				);
			})}
		</div>
	);
}

function LeechPanel({ leech }: { leech: NonNullable<DummyCard["leech"]> }) {
	return (
		<>
			<div className="flex flex-col gap-2">
				<StatusPill tone="grape">Sulit Dikuasai</StatusPill>
				<span className="text-ink-900 type-body max-lg:text-body-lg">
					Kode ini beberapa kali terlewat. Jawabannya ditampilkan dulu untuk dipelajari
					ulang.
				</span>
			</div>
			<Card className="gap-4 lg:gap-3">
				<span className="type-label text-ink-500">Daerah kode {leech.code}</span>
				<div className="flex flex-wrap gap-2">
					{leech.areas.map((area) => (
						<span
							key={area}
							className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-3 font-sans text-body-md leading-none font-medium text-ink-1000"
						>
							{area}
						</span>
					))}
				</div>
				<span className="font-sans text-body-sm leading-normal text-ink-500">
					+{leech.more} lainnya
				</span>
				<div className="h-px bg-hairline" />
				<span className="type-label text-ink-500">Catatan pengingat</span>
				<span className="text-ink-900 type-body">{leech.note}</span>
			</Card>
		</>
	);
}

function LoweredPanel({ card, onRestore }: { card: DummyCard; onRestore: () => void }) {
	return (
		<Card>
			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:flex-nowrap lg:gap-3">
					<span className="flex min-w-0 flex-col gap-2">
						<span className="type-card-title">Tebak daerah</span>
						<span className="inline-flex items-center gap-2">
							<LevelMark level={1} />
							<span className="font-sans text-body-sm leading-none text-ink-500">
								Level 1 Kenali
							</span>
						</span>
					</span>
					<StatusPill tone="muted">Tidak memengaruhi jadwal</StatusPill>
				</div>
				<div className="h-px bg-hairline" />
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:flex-nowrap lg:gap-3">
					<Button variant="outline" className="w-fit" onClick={onRestore}>
						Kembali ke Level {card.level} {levelName(card.level)}
					</Button>
					<StatusPill tone="go">Dihitung penuh</StatusPill>
				</div>
			</div>
		</Card>
	);
}

function NoteOffer({ onDismiss }: { onDismiss: () => void }) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-hairline bg-paper-0 p-4">
			<span className="text-ink-900 type-body">
				Kode ini beberapa kali terlewat. Tulis catatan pengingat?
			</span>
			<div className="flex items-center gap-3">
				<Button variant="outline" className="w-fit" href="/statistik/sulit">
					Tulis catatan
				</Button>
				<Button variant="quiet" className="w-fit bg-transparent" onClick={onDismiss}>
					Nanti saja
				</Button>
			</div>
		</div>
	);
}

function NextButton({ onNext }: { onNext: () => void }) {
	return (
		<Button block kbd="Enter" onClick={onNext}>
			Lanjut
		</Button>
	);
}

function Compare({
	state,
	card,
	onChoose,
	onNext
}: Pick<Props, "state" | "card" | "onChoose" | "onNext">) {
	const graded = state.phase === "graded";
	return (
		<>
			<Title>{card.prompt}</Title>
			<p className="font-sans text-body-md leading-normal text-ink-900">
				{card.compare?.lead}
			</p>
			<div className="grid grid-cols-2 gap-3">
				{card.options!.map((option, index) => {
					const tone = !graded
						? "border-ink-1000 bg-paper-0"
						: option === card.answer
							? "border-go-500 bg-go-100"
							: "border-stop-500 bg-stop-100";
					return (
						<button
							key={option}
							type="button"
							disabled={graded}
							aria-keyshortcuts={index ? "J" : "F"}
							onClick={() => onChoose(option)}
							className={`relative flex h-40 cursor-pointer items-center justify-center rounded-md border border-b-3 px-6 font-plate text-hero leading-none font-bold tracking-plate text-ink-1000 disabled:cursor-default ${tone}`}
						>
							<span className="absolute top-3 left-3 inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-ink-300 bg-paper-0 px-1.5 font-mono text-label leading-none font-medium tracking-normal text-ink-900 max-lg:hidden">
								{index ? "J" : "F"}
							</span>
							{option}
						</button>
					);
				})}
			</div>
			{graded && (
				<>
					<Callout tone="info" label={<span className="text-sky-700">Ciri pembeda</span>}>
						{card.compare?.hint}
					</Callout>
					<NextButton onNext={onNext} />
				</>
			)}
		</>
	);
}

function Intro({
	state,
	card,
	onChoose,
	onNext
}: Pick<Props, "state" | "card" | "onChoose" | "onNext">) {
	const graded = state.phase === "graded";
	return (
		<>
			<div className="flex flex-col items-start gap-4">
				<QuestionPlate card={card} />
				<Title>{card.prompt}</Title>
			</div>
			<div className="flex flex-col gap-2">
				{card.options!.map((option) => {
					const tone = !graded
						? "border-hairline bg-paper-0 cursor-pointer"
						: option === card.answer
							? "border-go-700 bg-go-100"
							: option === state.chosen
								? "border-stop-700 bg-stop-100"
								: "border-hairline bg-paper-0";
					return (
						<button
							key={option}
							type="button"
							disabled={graded}
							onClick={() => onChoose(option)}
							className={`flex min-h-12 items-center gap-3 rounded-sm border px-4 py-3 text-left disabled:cursor-default ${tone}`}
						>
							<span className="flex-1 font-sans text-body-lg leading-[1.3] text-ink-1000">
								{option}
							</span>
							{graded && option === state.chosen && option !== card.answer && (
								<span className="font-mono text-micro leading-none font-medium text-ink-500">
									{card.intro?.wrongTag?.[option]}
								</span>
							)}
						</button>
					);
				})}
			</div>
			{graded && card.intro && (
				<>
					<div className="flex flex-col gap-3 rounded-md border border-hairline bg-paper-0 p-4">
						<div className="flex items-baseline justify-between gap-3">
							<span className="font-display text-subhead leading-[1.2] font-semibold">
								Jawaban: {card.answer}
							</span>
							<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
								Tebakan tidak dinilai.
							</span>
						</div>
						<span className="type-label text-ink-500">
							Daerah kode {card.intro.code}
						</span>
						<div className="flex flex-wrap gap-2">
							{card.intro.areas.map((area) => (
								<span
									key={area}
									className="rounded-sm border border-hairline bg-paper-0 px-2.5 py-1.5 font-sans text-body-sm leading-[1.2] text-ink-900"
								>
									{area}
								</span>
							))}
						</div>
					</div>
					<NextButton onNext={onNext} />
					<Callout
						tone="info"
						label={<span className="text-sky-700">Belum dinilai</span>}
					>
						Tebakan pertama tidak mengubah jadwal dan tidak dicatat sebagai kode
						tertukar. Pengulangan pertama tersedia setelah satu menit.
					</Callout>
				</>
			)}
		</>
	);
}

function NameAll({ state, card, onInput, onAdd, onRemove, onSubmit, onNext }: Props) {
	return (
		<>
			<div className="flex flex-col items-start gap-4">
				<QuestionPlate card={card} />
				<Title>{card.prompt}</Title>
			</div>
			{state.named.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="type-label text-ink-500">
						{state.named.length} jawaban dicatat
					</span>
					<div className="flex flex-wrap gap-2">
						{state.named.map((name) => (
							<span
								key={name}
								className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-3 font-sans text-body-md leading-none font-medium text-ink-1000"
							>
								{name}
								<button
									type="button"
									aria-label={`Hapus ${name}`}
									onClick={() => onRemove(name)}
									className="cursor-pointer"
								>
									<Icon name="x" size={14} />
								</button>
							</span>
						))}
					</div>
				</div>
			)}
			<AnswerBox state={state} card={card} onInput={onInput} mono={false} />
			{state.phase === "graded" ? (
				<NextButton onNext={onNext} />
			) : (
				<div className="grid grid-cols-2 gap-3">
					<Button variant="outline" block kbd="Enter" onClick={onAdd}>
						Tambah
					</Button>
					<Button block onClick={onSubmit}>
						Selesai
					</Button>
				</div>
			)}
		</>
	);
}

export function Question(props: Props) {
	const {
		state,
		card,
		onInput,
		onSubmit,
		onChoose,
		onNext,
		onLower,
		onRestore,
		onDismissNote,
		countdown
	} = props;
	if (card.form === "bandingkan") return <Compare {...props} />;
	if (card.form === "perkenalan") return <Intro {...props} />;
	if (card.form === "sebutkan") return <NameAll {...props} />;

	const options = cardOptions(state, card);
	const graded = state.phase === "graded";
	const lowered = state.lowered.includes(card.id);
	const timed = card.timer && countdown !== null && !graded;
	return (
		<>
			{lowered && <LoweredPanel card={card} onRestore={onRestore} />}
			{state.undone && <StatusPill tone="muted">Jawaban dibatalkan</StatusPill>}
			{card.leech && !graded && <LeechPanel leech={card.leech} />}
			{card.notice && (
				<div className="flex items-center gap-2 rounded-sm border border-hairline px-4 py-3 text-ink-900 type-body">
					<Icon name="calendar-check" size={16} />
					{card.notice}
				</div>
			)}
			{timed && card.timer!.kind === "answer" && (
				<Countdown seconds={countdown} total={card.timer!.seconds} tone="stop" />
			)}
			<div className="flex flex-col items-start gap-4">
				<QuestionPlate card={card} />
				<Title>{card.prompt}</Title>
				{timed && card.timer!.kind === "start" && (
					<Countdown
						seconds={countdown}
						total={card.timer!.seconds}
						tone="caution"
						className="hidden lg:flex"
					/>
				)}
			</div>
			{/* A phone gives the countdown the column's wider gap. */}
			{timed && card.timer!.kind === "start" && (
				<Countdown
					seconds={countdown}
					total={card.timer!.seconds}
					tone="caution"
					className="flex lg:hidden"
				/>
			)}
			{options ? (
				<ChoiceGrid state={state} card={card} options={options} onChoose={onChoose} />
			) : (
				<AnswerBox
					state={state}
					card={card}
					onInput={onInput}
					mono={card.form === "tebakKode"}
				/>
			)}
			{graded && <Verdict state={state} card={card} />}
			{graded ? (
				<NextButton onNext={onNext} />
			) : (
				!options && (
					<Button block kbd="Enter" onClick={onSubmit}>
						Periksa
					</Button>
				)
			)}
			{!graded && card.lowerable && !lowered && cardLevel(state, card) > 1 && (
				<button
					type="button"
					onClick={onLower}
					className="inline-flex min-h-9 w-auto cursor-pointer items-center justify-center gap-2 self-center rounded-sm border border-transparent bg-transparent px-3 py-1.5 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-700"
				>
					<span className="flex flex-col items-start gap-1 text-left">
						<span>Turunkan ke Level 1</span>
						<span className="font-sans text-micro leading-none font-normal text-ink-500">
							Tidak memengaruhi jadwal
						</span>
					</span>
				</button>
			)}
			{graded && state.noteOffered && <NoteOffer onDismiss={onDismissNote} />}
		</>
	);
}

export const queueLength = (state: SessionState) => QUEUES[state.mode].length;
