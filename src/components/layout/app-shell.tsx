import { Wordmark } from "@/components/terka/wordmark";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col bg-paper-0 md:flex-row">
			<aside className="flex shrink-0 flex-col justify-between gap-4 border-b border-ink-200 px-4 py-5 md:fixed md:inset-y-0 md:left-0 md:w-sidebar md:gap-8 md:overflow-y-auto md:border-r md:border-b-0">
				<div className="flex flex-col gap-6">
					<span>
						<Wordmark compact />
					</span>
					<SidebarNav group="main" />
				</div>
				<SidebarNav group="utility" />
			</aside>
			<main className="flex min-w-0 flex-1 flex-col md:pl-sidebar">{children}</main>
		</div>
	);
}
