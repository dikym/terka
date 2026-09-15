import { Wordmark } from "@/components/terka/wordmark";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-paper-0 flex min-h-dvh">
			<aside className="w-sidebar border-ink-200 flex shrink-0 flex-col justify-between gap-8 border-r px-4 py-5">
				<div className="flex flex-col gap-6">
					<span className="px-2">
						<Wordmark compact />
					</span>
					<SidebarNav group="main" />
				</div>
				<SidebarNav group="utility" />
			</aside>
			<main className="flex min-w-0 flex-1 flex-col">{children}</main>
		</div>
	);
}
