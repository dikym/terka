"use client";

import { Link } from "@/components/ui/app-link";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { markLegalOrigin } from "@/lib/legal-origin";

const FACTS = [
	["perkiraan durasi", "3 menit"],
	["paling banyak", "28 soal"],
	["penilaian per soal", "tidak ada"]
];

const NOTES: [IconName, string][] = [
	["user", "Langsung belajar tanpa akun. Progres tersimpan di perangkat ini."],
	[
		"info",
		"Terka membantu belajar kode pelat, bukan rujukan resmi. Data yang belum cukup terverifikasi diberi penanda."
	]
];

// The skeleton is the welcome itself with its text hidden, so every line wraps, at every width and
// with either font, exactly where the real text will. Each line shows only a 0.72em bar, the same
// size as SkeletonText.
const MASK =
	"box-decoration-clone bg-[linear-gradient(transparent_calc(50%-0.36em),var(--color-ink-100)_calc(50%-0.36em),var(--color-ink-100)_calc(50%+0.36em),transparent_calc(50%+0.36em))] text-transparent animate-pulse [&_*]:text-transparent";

function Text({ ghost, children }: { ghost: boolean; children: ReactNode }) {
	return ghost ? <span className={MASK}>{children}</span> : <>{children}</>;
}

function Mark({
	ghost,
	name,
	size,
	className = ""
}: {
	ghost: boolean;
	name: IconName;
	size: number;
	className?: string;
}) {
	return ghost ? (
		<Skeleton className={`flex-none rounded-full ${className}`} width={`${size}px`} />
	) : (
		<Icon name={name} size={size} color="bg-ink-500" className={className} />
	);
}

function WelcomeBody({
	ghost,
	onStart,
	onSkip
}: {
	ghost: boolean;
	onStart?: () => void;
	onSkip?: () => void;
}) {
	return (
		<>
			<header className="border-b border-hairline">
				<div className="container flex min-h-15 items-center justify-between gap-3 py-2 lg:gap-4 lg:py-4">
					<Wordmark />
					{ghost ? (
						<span className="inline-flex items-center gap-1.5 font-display text-body-sm leading-none font-semibold">
							<Text ghost>Tentang Terka</Text>
							<Mark ghost name="chevron-right" size={16} className="h-4" />
						</span>
					) : (
						<Link
							href="/tentang"
							onClick={() => {
								markLegalOrigin(false);
								onSkip?.();
							}}
							className="inline-flex items-center gap-1.5 font-display text-body-sm leading-none font-semibold text-ink-1000 underline underline-offset-[3px]"
						>
							Tentang Terka
							<Icon name="chevron-right" size={16} />
						</Link>
					)}
				</div>
			</header>
			<section className="container flex flex-1 flex-col gap-6 py-6 lg:gap-8 lg:py-10">
				<div className="flex min-w-0 flex-col gap-4 border-b border-hairline pb-6 lg:pb-8">
					<h1
						id={ghost ? undefined : "sambutan-title"}
						className="font-display text-display leading-[1.05] font-bold tracking-title"
					>
						<Text ghost={ghost}>Terka</Text>
					</h1>
					<p className="font-display text-subhead leading-[1.3] font-semibold text-ink-900 lg:text-heading">
						<Text ghost={ghost}>
							Lihat pelatnya, terka asalnya.
							<br />
							Latihan hafalan kode pelat nomor Indonesia.
						</Text>
					</p>
				</div>
				<div className="flex min-w-0 flex-col gap-4">
					<span className="type-label text-ink-500">
						<Text ghost={ghost}>Tes penempatan</Text>
					</span>
					<h2 className="font-display text-heading leading-[1.2] font-bold tracking-title lg:text-title lg:leading-snug">
						<Text ghost={ghost}>
							Mulai dengan tes singkat untuk menentukan titik awalmu. Belum tahu satu
							kode pun juga tidak apa-apa.
						</Text>
					</h2>
				</div>
				<div className="contents lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
					<div className="flex min-w-0 flex-col gap-4">
						<div className="flex flex-col border-t border-hairline">
							{FACTS.map(([label, value]) => (
								<div
									key={label}
									className="flex items-baseline justify-between gap-4 border-b border-hairline py-3"
								>
									<span className="font-sans text-body-sm leading-[1.2] text-ink-500">
										<Text ghost={ghost}>{label}</Text>
									</span>
									<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
										<Text ghost={ghost}>{value}</Text>
									</span>
								</div>
							))}
						</div>
						<p className="font-sans text-body-sm leading-normal text-ink-500">
							<Text ghost={ghost}>
								Jawab <b className="font-semibold text-ink-900">Tidak tahu</b> kalau
								belum kenal kodenya; tes berhenti sendiri saat sudah cukup. Kode
								yang dijawab benar langsung masuk pengulangan, sisanya diperkenalkan
								bertahap. Hasilnya juga menentukan batas materi baru per hari.
							</Text>
						</p>
					</div>
					<div className="flex min-w-0 flex-col gap-3">
						{ghost ? (
							<>
								<Skeleton className="block h-12 w-full rounded-sm" />
								<Skeleton className="block h-12 w-full rounded-sm" />
							</>
						) : (
							<>
								<Button
									block
									icon="play"
									kbd="Enter"
									className="px-4"
									onClick={onStart}
								>
									Mulai tes
								</Button>
								<Button variant="secondary" block className="px-4" onClick={onSkip}>
									Lewati, mulai dari awal
								</Button>
							</>
						)}
					</div>
				</div>
			</section>
			<footer className="border-t border-hairline">
				<ul className="container flex flex-col gap-3 py-6 lg:flex-row lg:gap-10 lg:py-5">
					{NOTES.map(([icon, text]) => (
						<li key={icon} className="flex min-w-0 items-start gap-3 lg:last:flex-1">
							<Mark ghost={ghost} name={icon} size={18} className="mt-0.5 h-4.5" />
							<p className="font-sans text-body-sm leading-normal text-ink-500">
								<Text ghost={ghost}>{text}</Text>
							</p>
						</li>
					))}
				</ul>
			</footer>
		</>
	);
}

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
	const dialog = useRef<HTMLDivElement>(null);
	useFocusTrap(dialog);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Enter" && event.target === document.body) onStart();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onStart]);

	return (
		<div
			ref={dialog}
			role="dialog"
			aria-modal="true"
			aria-labelledby="sambutan-title"
			className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-paper-0"
		>
			<WelcomeBody ghost={false} onStart={onStart} onSkip={onSkip} />
		</div>
	);
}

/**
 * The welcome's shape before React has decided whether to show it. It sits in the static page and
 * shows only while the first-visit script marks the page, covering the home skeleton underneath.
 */
export function WelcomeSkeleton() {
	return (
		<div
			data-welcome-skeleton
			aria-hidden="true"
			className="fixed inset-0 z-40 hidden flex-col overflow-y-auto bg-paper-0"
		>
			<WelcomeBody ghost />
		</div>
	);
}
