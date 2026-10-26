"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Kbd } from "@/components/ui/kbd";
import { PageTitle } from "@/components/ui/page-title";

type Shortcut = { keys: string[]; title: string; hint?: string };

const IN_SESSION: Shortcut[] = [
	{
		keys: ["Enter"],
		title: "Kirim jawaban, lalu lanjut",
		hint: "Tekan sekali untuk menilai, sekali lagi untuk ke soal berikutnya"
	},
	{
		keys: ["F", "G", "H", "J"],
		title: "Pilih jawaban",
		hint: "Urutan sesuai pilihan di layar, dari atas"
	},
	{
		keys: ["F", "J"],
		title: "Pilih kiri atau kanan",
		hint: "Benar atau salah, dan Bandingkan Kode"
	},
	{
		keys: ["Z"],
		title: "Batalkan jawaban terakhir",
		hint: "Berlaku sampai soal berikutnya dinilai. Tidak tersedia di Mode Kilat."
	},
	{ keys: ["Esc"], title: "Keluar sesi" }
];

const OUTSIDE: Shortcut[] = [
	{ keys: ["S"], title: "Mulai belajar" },
	{ keys: ["B"], title: "Mode Kilat" },
	{ keys: ["C"], title: "Buka Cakupan" },
	{ keys: ["/"], title: "Cari di Referensi" },
	{
		keys: ["Enter"],
		title: "Mulai sesi atau pilih wilayah",
		hint: "Di pratinjau sesi dan Cakupan"
	},
	{ keys: ["Esc"], title: "Kembali", hint: "Dari pratinjau sesi" }
];

function Group({ title, count, items }: { title: string; count: number; items: Shortcut[] }) {
	return (
		<div className="flex flex-col">
			<header className="flex items-baseline justify-between gap-3 border-b border-ink-1000 pb-2 lg:border-0 lg:pb-3">
				<span className="type-label text-ink-1000">{title}</span>
				<span className="font-mono text-micro leading-none font-medium text-ink-500">
					{count} tombol
				</span>
			</header>
			{items.map((item) => (
				// A phone lists it like a Setelan row: text first, the keys on the right.
				<div
					key={item.title}
					className={`flex items-start justify-between gap-5 border-b border-hairline py-4 lg:grid lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-4 lg:border-t lg:border-b-0 lg:py-3 ${item.hint ? "lg:items-baseline" : "lg:items-center"}`}
				>
					<span className="order-last flex flex-none flex-wrap justify-end gap-1 lg:order-0 lg:justify-start">
						{item.keys.map((key) => (
							<Kbd
								key={key}
								variant="cap"
								// A smaller cap on a phone, same shape.
								className="max-lg:h-7 max-lg:min-w-7 max-lg:px-1.5 max-lg:text-body-sm"
							>
								{key}
							</Kbd>
						))}
					</span>
					<span className="flex min-w-0 flex-col gap-1 lg:gap-0.75">
						<span className="font-sans text-body-md leading-[1.3] font-medium text-ink-1000 lg:font-display lg:font-semibold lg:text-ink-900">
							{item.title}
						</span>
						{item.hint && (
							<span className="font-sans text-body-sm leading-normal text-ink-500">
								{item.hint}
							</span>
						)}
					</span>
				</div>
			))}
		</div>
	);
}

export function KeyboardShortcutsScreen() {
	const router = useRouter();
	const back = () => (window.history.length > 1 ? router.back() : router.push("/beranda"));
	const latestBack = useRef(back);
	useEffect(() => {
		latestBack.current = back;
	});

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") latestBack.current();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<>
			<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-8 lg:border-b lg:border-ink-300 lg:pb-5">
				<PageTitle title="Papan tombol" back={back} />
				<div className="flex flex-col gap-1 rounded-sm border border-ink-200 bg-paper-50 px-4 py-3 lg:max-w-[46ch] lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
					<span className="type-label text-ink-700 lg:text-ink-1000">Tanpa mouse</span>
					<p className="text-ink-900 type-body">
						Alur menjawab lalu lanjut dirancang agar bisa dijalankan penuh dari papan
						tombol, termasuk saat berpindah Cakupan.
					</p>
				</div>
			</div>
			<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-6">
				<Group title="Selama sesi" count={7} items={IN_SESSION} />
				<Group title="Di luar sesi" count={6} items={OUTSIDE} />
			</div>
		</>
	);
}
