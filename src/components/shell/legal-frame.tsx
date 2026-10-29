"use client";

import { useEffect } from "react";
import { PageTitle } from "@/components/ui/page-title";
import { useOpenedFromSettings } from "@/lib/legal-origin";
import { AppShell } from "./app-shell";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * The frame of the about page and privacy policy. Opened from Setelan it sits inside the app, with
 * the sidebar and a back arrow; opened any other way it is a public page with the site header and
 * footer. The server render is the public one, so the text stays readable without JavaScript.
 */
export function LegalFrame({ title, children }: { title: string; children: React.ReactNode }) {
	const fromSettings = useOpenedFromSettings();
	// The root layout hides the public frame before first paint when a reload is known to land here.
	useEffect(() => {
		if (fromSettings) delete document.documentElement.dataset.legal;
	}, [fromSettings]);
	if (fromSettings)
		return (
			<AppShell>
				<div className="mx-auto flex w-full max-w-prose flex-col gap-5 lg:gap-6">
					<PageTitle title={title} back="/setelan" />
					{children}
				</div>
			</AppShell>
		);
	return (
		<div data-legal-public="" className="flex min-h-dvh flex-col">
			<SiteHeader />
			<main className="container flex flex-1 flex-col pt-20 pb-10 lg:pt-25">
				<div className="mx-auto flex w-full max-w-prose flex-col gap-5 lg:gap-6">
					<PageTitle title={title} />
					{children}
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
