import type { FlagCode } from "@/components/ui/icon";
import { holderFlag } from "../view/flags";
import { areaDisplayName, highMembers, type NameDictionary } from "@/core/answers/dictionary";
import type { Bundle } from "@/core/content/schema";
import type { Scope } from "@/core/questions/distractors";
import { LABELS, parseCardId, type Question } from "@/core/questions/question";
import type { CardEntry } from "@/core/replay/state";
import { checkAnswer } from "@/core/session/check";
import type { QueueItem } from "@/core/session/context";
import type { Mode } from "./modes";

export type CardForm =
	| "tebakDaerah"
	| "tebakKode"
	| "tebakBerwaktu"
	| "sebutkan"
	| "perkenalan"
	| "benarSalah"
	| "manaBukan"
	| "tebakDiplomat"
	| "bandingkan";

export type Level = 1 | 2 | 3;

export type SessionCard = {
	id: string;
	form: CardForm;
	/** Plate parts; the first part is the one asked about. */
	plate?: [string, string?, string?];
	prompt: string;
	/** The right choice on choice screens, else the answer shown after a miss. */
	answer: string;
	flag?: FlagCode;
	options?: string[];
	level: Level;
	pill?: { label: string; tone: "caution" | "go" | "grape" };
	timer?: { seconds: number; kind: "start" | "answer" };
	leech?: { code: string; areas: string[]; more: number; note: string };
	notice?: string;
	compare?: { lead: string; hint: string };
	intro?: { code: string; areas: string[]; wrongTag?: Record<string, string> };
	question: Question;
	item: QueueItem;
};

export type CardDeps = {
	bundle: Bundle;
	dictionary: NameDictionary;
	notes: ReadonlyMap<string, string>;
	mode: Mode;
	/** Latihan Terfokus: this answer also counts for today's schedule. */
	counts: boolean;
	scope?: Scope;
};

const NO_PILL = new Set<Mode>(["kilat", "harian", "penempatan"]);
const LEECH_SHOWN = 5;

export const rightChoice = (
	question: Question,
	bundle: Bundle,
	dictionary: NameDictionary
): string | null =>
	question.choices.find(
		(choice) => checkAnswer(question, { choice }, bundle, dictionary).correct === true
	) ?? null;

function shownAnswer(question: Question, bundle: Bundle): string {
	const { answer } = question;
	const region = (id: string) => bundle.regions.find((item) => item.id === id);
	const special = (id: string) => bundle.specials.find((item) => item.id === id);
	switch (answer.kind) {
		case "area":
		case "set":
			return region(answer.codeId)?.region ?? "";
		case "region-code":
			return answer.codeIds.map((id) => region(id)?.code ?? id).join(" / ");
		case "holder":
			return special(answer.specialId)?.holder ?? "";
		case "special-code":
			return `CD ${special(answer.specialId)?.number ?? ""}`;
		case "literal":
			return answer.value;
	}
}

function formOf(question: Question): CardForm {
	const { mode } = parseCardId(question.cardId);
	if (question.context === "intro") return "perkenalan";
	if (question.label === LABELS.compare) return "bandingkan";
	if (question.questionType === "setrecall") return "sebutkan";
	if (question.questionType === "truefalse") return "benarSalah";
	if (question.questionType === "oddoneout") return "manaBukan";
	if (mode === "special2holder" || mode === "holder2special") return "tebakDiplomat";
	if (question.limit?.until === "first-input" && question.level === 3) return "tebakBerwaktu";
	return mode === "region2code" ? "tebakKode" : "tebakDaerah";
}

export function toCard(
	question: Question,
	item: QueueItem,
	entry: CardEntry,
	deps: CardDeps
): SessionCard {
	const { bundle, dictionary } = deps;
	const { contentId, mode } = parseCardId(question.cardId);
	const region = bundle.regions.find((item) => item.id === contentId);
	const special = bundle.specials.find((item) => item.id === contentId);
	const form = formOf(question);
	const correct = rightChoice(question, bundle, dictionary);
	const card: SessionCard = {
		id: question.cardId,
		form,
		prompt: question.prompt,
		answer: correct ?? shownAnswer(question, bundle),
		level: question.level,
		question,
		item
	};
	if (question.choices.length) card.options = question.choices;
	if (region && mode !== "region2code" && form !== "bandingkan") card.plate = [region.code];
	if (special) {
		card.flag = holderFlag(special);
		if (mode === "special2holder") card.plate = ["CD", special.number];
	}
	if (!NO_PILL.has(deps.mode))
		card.pill = {
			label: question.label,
			tone: form === "perkenalan" ? "go" : form === "bandingkan" ? "grape" : "caution"
		};
	if (question.limit)
		card.timer = {
			seconds: question.limit.ms / 1000,
			kind: question.limit.until === "first-input" ? "start" : "answer"
		};
	if (question.reveal && question.assisted) {
		const lines = question.reveal.lines;
		card.leech = {
			code: region?.code ?? `CD ${special?.number ?? ""}`,
			areas: lines.slice(0, LEECH_SHOWN),
			more: Math.max(0, lines.length - LEECH_SHOWN),
			note: deps.notes.get(contentId) ?? ""
		};
	}
	if (deps.counts) card.notice = "Soal ini juga dihitung untuk jadwal hari ini.";
	if (form === "bandingkan" && question.hint) {
		const { a, b } = question.hint;
		card.compare = {
			lead: `${a.code} dan ${b.code} sering tertukar. Bedakan keduanya.`,
			hint: `${a.code}: ${a.place} · ${b.code}: ${b.place}`
		};
	}
	if (form === "perkenalan" && region) {
		const wrongTag: Record<string, string> = {};
		for (const choice of question.choices) {
			if (choice === correct) continue;
			const owner = checkAnswer(question, { choice }, bundle, dictionary).confusedWith;
			const code = bundle.regions.find((item) => item.id === owner)?.code;
			if (code) wrongTag[choice] = code;
		}
		card.intro = {
			code: region.code,
			areas: highMembers(bundle, region).map(areaDisplayName),
			wrongTag
		};
	}
	if (form === "perkenalan" && special)
		card.intro = { code: `CD ${special.number}`, areas: [special.holder] };
	return card;
}
