"use client";

import { Link } from "@/components/ui/app-link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/plate";
import { useFocusTrap } from "@/components/ui/use-focus-trap";

const FACTS = [
	["perkiraan durasi", "3 menit"],
	["paling banyak", "28 soal"],
	["penilaian per soal", "tidak ada"]
];

export function Sambutan({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
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
			<section className="border-b border-hairline bg-paper-50">
				<div className="container flex flex-col items-start gap-6 pt-8 pb-6 lg:gap-8 lg:py-10">
					<Wordmark />
					<div className="flex min-w-0 flex-col gap-4">
						<h1
							id="sambutan-title"
							className="font-display text-display leading-[1.05] font-bold tracking-title"
						>
							Terka
						</h1>
						<p className="max-w-[24ch] font-display text-heading leading-[1.3] font-semibold text-pretty text-ink-900">
							Lihat pelatnya, terka asalnya. Latihan hafalan kode pelat nomor
							Indonesia.
						</p>
					</div>
				</div>
			</section>
			<section className="container flex flex-1 flex-col gap-6 py-6 lg:gap-8 lg:py-10">
				<div className="flex min-w-0 flex-col gap-4">
					<span className="type-label text-ink-500">Tes penempatan</span>
					<h2 className="font-display text-heading leading-[1.2] font-bold tracking-title text-pretty lg:text-title lg:leading-snug">
						Sudah tahu sebagian kode pelat? Tes singkat ini memindahkan kode yang sudah
						dikenal langsung ke pengulangan.
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
										{label}
									</span>
									<span className="font-mono text-body-md leading-none font-semibold text-ink-1000">
										{value}
									</span>
								</div>
							))}
						</div>
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-500">
							Kode yang dijawab benar langsung masuk pengulangan; lainnya tetap jadi
							materi baru. Hasilnya juga menentukan batas materi baru per hari.
						</p>
					</div>
					<div className="flex min-w-0 flex-col gap-3">
						<Button block icon="play" kbd="Enter" className="px-4" onClick={onStart}>
							Mulai tes
						</Button>
						<Button variant="secondary" block className="px-4" onClick={onSkip}>
							Lewati, mulai dari awal
						</Button>
					</div>
				</div>
			</section>
			<footer className="border-t border-hairline">
				<div className="container grid grid-cols-1 items-start gap-4 pt-5 pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-10 lg:py-5">
					<div className="flex min-w-0 items-start gap-3">
						<Icon name="user" size={18} className="mt-0.5 lg:mt-0" />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-900">
							Langsung belajar tanpa akun. Progres tersimpan di perangkat ini.
						</p>
					</div>
					<div className="flex min-w-0 items-start gap-3">
						<Icon name="info" size={18} className="mt-0.5 lg:mt-0" />
						<p className="font-sans text-body-sm leading-normal text-pretty text-ink-900">
							Terka membantu belajar kode pelat, bukan rujukan resmi. Data yang belum
							cukup terverifikasi diberi penanda.
						</p>
					</div>
					<Link
						href="/tentang"
						onClick={onSkip}
						className="font-display text-body-sm leading-normal font-semibold whitespace-nowrap text-caution-700 hover:text-ink-1000"
					>
						Tentang Terka
					</Link>
				</div>
			</footer>
		</div>
	);
}
