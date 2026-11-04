import { default_w } from "ts-fsrs";
import type { FsrsParams } from "@/core/log/events";
import { addParams, paramsAt } from "@/core/replay/params";
import type { CountedAnswer } from "@/core/optimizer/counted";
import { trainingSetHash } from "@/core/optimizer/hash";

export type ParamsDraft = Omit<FsrsParams, "id" | "deviceId" | "receivedAt" | "serverSeq">;

export const activeList = (rows: readonly FsrsParams[]) =>
	rows.reduce<FsrsParams[]>((list, row) => addParams(list, row), []);

export const weightsOf = (row: FsrsParams | null): number[] => row?.weights ?? [...default_w];

export const currentWeights = (rows: readonly FsrsParams[], at: number) =>
	weightsOf(paramsAt(activeList(rows), at));

export async function identityOf(used: readonly CountedAnswer[]) {
	const ids = used.map((answer) => answer.id).sort();
	return {
		trainedReviewCount: ids.length,
		trainedThroughSeq: used.some((answer) => answer.serverSeq === null)
			? null
			: Math.max(...used.map((answer) => answer.serverSeq!)),
		trainingSetHash: await trainingSetHash(ids),
		trainingEventIds: ids
	};
}
