"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { HardCodesScreen } from "@/components/screens/stats-detail";
import { cardEvent } from "@/core/session/commands";
import { lastDayOf, sessionCtx } from "@/lib/app/runtime";
import { useAppState, usePrefs, useReady } from "@/lib/app/use-runtime";
import { hardCardList } from "@/lib/view/stats";

function Sulit() {
	const initial = useSearchParams().get("kode");
	const { runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const cards = useMemo(
		() => (runtime && app ? hardCardList(app.log.state, runtime.bundle) : null),
		[runtime, app]
	);
	return (
		<HardCodesScreen
			cards={cards}
			notes={prefs?.notes ?? new Map()}
			initial={initial}
			onSaveNote={async (card, body) =>
				!!runtime && (await runtime.saveNote(card.contentId, body.trim())) === "ok"
			}
			onReactivate={async (card) => {
				if (!runtime) return false;
				const state = runtime.store.getState().log.state;
				const event = cardEvent(
					card.cardId,
					"unsuspend",
					sessionCtx(runtime),
					lastDayOf(state)
				);
				const outcome = await runtime.store.record([event]);
				return outcome !== "quota";
			}}
		/>
	);
}

export default function Page() {
	return (
		<Suspense>
			<Sulit />
		</Suspense>
	);
}
