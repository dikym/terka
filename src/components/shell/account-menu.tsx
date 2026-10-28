"use client";

import { useRouter } from "next/navigation";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { useAccount } from "@/lib/app/use-runtime";
import { openLogin } from "@/lib/auth/return-to";
import { useAccountContext } from "./account-provider";

/** The account entry of the sidebar and the phone's top bar. */
export function AccountMenu({
	iconOnly = false,
	className,
	triggerClassName,
	menuClassName
}: {
	iconOnly?: boolean;
	className?: string;
	triggerClassName: string;
	menuClassName: string;
}) {
	const router = useRouter();
	const account = useAccount();
	const { actions } = useAccountContext();

	const entries: MenuEntry[] = [
		{ label: "Setelan", icon: "settings", onSelect: () => router.push("/setelan") },
		{ label: "Papan tombol", icon: "keyboard", onSelect: () => router.push("/papan-tombol") },
		"separator",
		{ label: "Ekspor data", icon: "download", onSelect: actions.exportData },
		{ label: "Impor data", icon: "upload", onSelect: actions.importData }
	];
	// Whether someone is signed in is unknown until the stored session is read.
	if (account.known)
		entries.push(
			"separator",
			account.email
				? { label: "Keluar", icon: "log-out", onSelect: actions.signOut }
				: { label: "Masuk", icon: "user", onSelect: () => openLogin(router) }
		);

	return (
		<Menu
			label="Akun"
			icon="user"
			entries={entries}
			iconOnly={iconOnly}
			caret={iconOnly ? undefined : "up"}
			className={className}
			triggerClassName={triggerClassName}
			menuClassName={menuClassName}
		/>
	);
}
