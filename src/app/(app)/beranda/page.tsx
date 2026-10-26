"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppFailed } from "@/components/screens/app-status";
import { Beranda } from "@/components/screens/beranda";
import { PerubahanData } from "@/components/screens/perubahan-data";
import { Sambutan, SambutanSkeleton } from "@/components/screens/sambutan";
import { showToast } from "@/lib/toasts";
import { placementAvailable } from "@/core/session/placement";
import { pendingNotices } from "@/core/views/notices";
import { sessionCtx } from "@/lib/app/runtime";
import { useAppState, usePrefs, useReady, useSyncLabel } from "@/lib/app/use-runtime";
import { markNotified, readFlags } from "@/lib/db/flags";
import { readFlag, SEEN_CONTENT_REV, useFlag, WELCOME_SEEN, writeFlag } from "@/lib/flags";
import { dataChanges } from "@/lib/view/changes";
import { homeView } from "@/lib/view/home";

const NOTICE = {
	leech: "Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.",
	confidence: "Data kode ini perlu diverifikasi. Soalnya dinonaktifkan sementara.",
	"missing-data": "Data kode ini perlu diverifikasi. Soalnya dinonaktifkan sementara."
};

const subscribeNever = () => () => {};

function Home() {
	const router = useRouter();
	const params = useSearchParams();
	const { status, runtime } = useReady();
	const app = useAppState(runtime);
	const prefs = usePrefs(runtime);
	const syncLabel = useSyncLabel(runtime);
	const welcomeSeen = useFlag("local", WELCOME_SEEN, "1");
	const [dismissed, setDismissed] = useState(false);
	const [starting, setStarting] = useState(false);
	// False while hydrating the static page, true from the first client render on.
	const mounted = useSyncExternalStore(
		subscribeNever,
		() => true,
		() => false
	);
	useEffect(() => {
		if (mounted) delete document.documentElement.dataset.welcome;
	}, [mounted]);
	const [notified, setNotified] = useState<Set<string> | null>(null);

	const data = useMemo(() => {
		if (!runtime || !app || !prefs || syncLabel === null) return null;
		return homeView(
			app.log.state,
			runtime.bundle,
			prefs.settings,
			sessionCtx(runtime),
			syncLabel
		);
	}, [runtime, app, prefs, syncLabel]);

	useEffect(() => {
		if (runtime) void readFlags(runtime.db).then((flags) => setNotified(flags.notified));
	}, [runtime]);

	const notices =
		runtime && app && notified
			? pendingNotices(app.log.state, notified, runtime.bundle.contentRev)
			: [];
	const closeNotices = () => {
		if (!runtime) return;
		const keys = notices.map((notice) => notice.key);
		void markNotified(runtime.db, keys);
		setNotified((current) => new Set([...(current ?? []), ...keys]));
	};

	const noticeKey = notices.map((notice) => notice.key).join(",");
	// The toast reads the notices and the close handler of the render that showed it.
	const latestNotices = useRef({ notices, closeNotices });
	useEffect(() => {
		latestNotices.current = { notices, closeNotices };
	});
	useEffect(() => {
		if (!noticeKey) return;
		const { notices, closeNotices } = latestNotices.current;
		showToast({
			tone: "warn",
			label: notices.length > 1 ? `${notices.length} kode dinonaktifkan` : "Dinonaktifkan",
			text: NOTICE[notices[0].reason],
			key: "notices",
			action: { label: "Tinjau kode", onClick: () => router.push("/statistik/sulit") },
			// Closing it, or opening the codes, marks every notice in it as read.
			onDismiss: closeNotices
		});
	}, [noticeKey, router]);

	// Before the log loads, a visitor who has not seen the welcome is almost always new, so it shows
	// at once; it closes again if the log turns out to hold practice already.
	const welcome =
		starting ||
		(mounted &&
			welcomeSeen !== "1" &&
			!dismissed &&
			(!app || placementAvailable(app.log.state)));
	const dismiss = () => {
		writeFlag("local", WELCOME_SEEN, "1");
		setDismissed(true);
	};

	if (status.status === "contentFailed" || status.status === "storageFailed")
		return <AppFailed status={status} />;
	if (params.get("perubahan") === "1") {
		const seen = Number(readFlag("local", SEEN_CONTENT_REV)) || null;
		return (
			<PerubahanData
				data={runtime && app ? dataChanges(app.log.state, runtime.bundle, seen) : null}
				onClose={() => {
					if (runtime)
						writeFlag("local", SEEN_CONTENT_REV, String(runtime.bundle.contentRev));
					router.push("/beranda");
				}}
			/>
		);
	}
	return (
		<>
			<Beranda
				data={data}
				onScope={(scope) => {
					if (runtime && prefs) void runtime.saveSettings({ ...prefs.settings, scope });
				}}
			/>
			{welcome && (
				<Sambutan
					// The welcome stays on screen until the test opens, so the home screen never flashes.
					onStart={() => {
						setStarting(true);
						writeFlag("local", WELCOME_SEEN, "1");
						router.push("/sesi?mode=penempatan");
					}}
					onSkip={dismiss}
				/>
			)}
		</>
	);
}

export default function Page() {
	return (
		<>
			<SambutanSkeleton />
			<Suspense>
				<Home />
			</Suspense>
		</>
	);
}
