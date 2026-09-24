import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { Callout } from "@/components/ui/callout";
import { Kbd } from "@/components/ui/kbd";
import { LabelText } from "@/components/ui/label-text";

type Shortcut = { key: string; label: string; note?: string };

const groups: { title: string; rows: Shortcut[] }[] = [
	{
		title: "Selama sesi",
		rows: [
			{
				key: "Enter",
				label: "Kirim jawaban",
				note: "Sistem memeriksa jawaban dan menilai sendiri"
			},
			{
				key: "Enter",
				label: "Lanjut",
				note: "Setelah jawaban benar dan fakta konteks tampil"
			},
			{
				key: "Z",
				label: "Batalkan jawaban terakhir",
				note: "Berlaku sampai kartu berikutnya dinilai"
			},
			{
				key: "L",
				label: "Turunkan level soal",
				note: "Jawaban benar di level lebih rendah tidak mengubah jadwal"
			},
			{ key: "Esc", label: "Keluar sesi" }
		]
	},
	{
		title: "Di luar sesi",
		rows: [
			{ key: "S", label: "Mulai belajar" },
			{ key: "T", label: "Tantangan Harian" },
			{ key: "B", label: "Mode Kilat" },
			{ key: "C", label: "Buka Cakupan" },
			{ key: "/", label: "Cari di referensi" },
			{ key: "?", label: "Buka daftar ini" }
		]
	}
];

export function ShortcutsScreen() {
	return (
		<PageFrame>
			<div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:gap-8">
				<PageTitle back="/">Papan tombol</PageTitle>
				<Callout
					title="Tanpa mouse"
					className="max-w-75 border-0 bg-transparent p-0 text-body-sm"
				>
					Alur menjawab lalu lanjut dirancang agar bisa dijalankan penuh dari papan
					tombol, termasuk saat berpindah Cakupan.
				</Callout>
			</div>
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				{groups.map((group) => (
					<section key={group.title} className="flex flex-col">
						<div className="flex items-center justify-between border-b border-ink-200 pb-2">
							<LabelText>{group.title}</LabelText>
							<span className="font-mono text-micro text-ink-500">
								{group.rows.length} tombol
							</span>
						</div>
						{group.rows.map((row) => (
							<div
								key={row.label}
								className="flex items-start gap-4 border-b border-ink-200 py-3"
							>
								<span className="flex min-w-14 shrink-0">
									<Kbd className="inline-flex h-6.5 min-w-6.5 shrink-0 items-center justify-center border-ink-1000 bg-paper-50 px-1.75 py-0 text-body-sm leading-none opacity-100 shadow-[0_2px_0_var(--color-ink-1000)]">
										{row.key}
									</Kbd>
								</span>
								<div className="flex flex-col gap-0.5">
									<span className="font-display text-body-md font-semibold text-ink-1000">
										{row.label}
									</span>
									{row.note ? (
										<span className="text-body-sm text-ink-500">
											{row.note}
										</span>
									) : null}
								</div>
							</div>
						))}
					</section>
				))}
			</div>
		</PageFrame>
	);
}
