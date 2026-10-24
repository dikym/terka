"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { BACK_BUTTON } from "@/components/ui/page-title";

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
			<header className="flex items-baseline justify-between gap-3 pb-3">
				<span className="type-label text-ink-1000">{title}</span>
				<span className="font-mono text-micro leading-none font-medium text-ink-500">
					{count} tombol
				</span>
			</header>
			{items.map((item) => (
				<div
					key={item.title}
					className={`grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-hairline py-3 ${item.hint ? "items-baseline" : "items-center"}`}
				>
					<span className="flex flex-wrap gap-1">
						{item.keys.map((key) => (
							<Kbd key={key} variant="cap">
								{key}
							</Kbd>
						))}
					</span>
					<span className="flex flex-col gap-[3px]">
						<span className="font-display text-body-md leading-[1.3] font-semibold">
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

export function PapanTombol() {
	const router = useRouter();
	const back = () => (window.history.length > 1 ? router.back() : router.push("/"));
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
			<div className="flex items-start justify-between gap-8 border-b border-ink-300 pb-5">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={back}
						aria-label="Kembali"
						title="Kembali"
						className={BACK_BUTTON}
					>
						<Icon name="arrow-left" size={24} />
					</button>
					<h1 className="type-screen-title">Papan tombol</h1>
				</div>
				<div className="flex max-w-[46ch] flex-col gap-2">
					<span className="type-label text-ink-1000">Tanpa mouse</span>
					<p className="text-ink-900 type-body">
						Alur menjawab lalu lanjut dirancang agar bisa dijalankan penuh dari papan
						tombol, termasuk saat berpindah Cakupan.
					</p>
				</div>
			</div>
			<div className="grid grid-cols-2 items-start gap-6">
				<Group title="Selama sesi" count={7} items={IN_SESSION} />
				<Group title="Di luar sesi" count={6} items={OUTSIDE} />
			</div>
		</>
	);
}
