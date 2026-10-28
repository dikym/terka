"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useAccountActions } from "@/components/screens/account-actions";
import type { Runtime } from "@/lib/app/runtime";

type AccountContext = {
	actions: ReturnType<typeof useAccountActions>;
	/** Counts every export, import, sign-out and account deletion, for screens that show their result. */
	revision: number;
	refresh: () => void;
};

const Context = createContext<AccountContext | null>(null);

/** One set of account actions for the whole shell, so the menu and the account screen share dialogs. */
export function AccountProvider({
	runtime,
	children
}: {
	runtime: Runtime | null;
	children: React.ReactNode;
}) {
	const [revision, setRevision] = useState(0);
	const refresh = useCallback(() => setRevision((value) => value + 1), []);
	const actions = useAccountActions(runtime, refresh);
	return (
		<Context.Provider value={{ actions, revision, refresh }}>
			{children}
			{actions.dialogs}
		</Context.Provider>
	);
}

export function useAccountContext(): AccountContext {
	const value = useContext(Context);
	if (!value) throw new Error("useAccountContext needs an AccountProvider");
	return value;
}
