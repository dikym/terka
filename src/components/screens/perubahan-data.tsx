import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { PageTitle } from "@/components/ui/page-title";
import { dataChange } from "@/dummy/home";

function Item({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 rounded-sm border border-hairline px-4 py-3">
			<span className="font-display text-body-md leading-[1.2] font-semibold">{title}</span>
			<span className="font-sans text-body-sm leading-[1.4] text-ink-500">{children}</span>
		</div>
	);
}

export function PerubahanData({ onClose }: { onClose: () => void }) {
	return (
		<>
			<PageTitle title="Perubahan data" back={onClose} />
			<div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="flex min-w-0 flex-col gap-3">
						<div className="flex items-center gap-3">
							<span className="inline-flex w-fit items-center gap-2 self-start rounded-full border border-transparent bg-sky-100 px-2.5 py-1 type-label whitespace-nowrap text-ink-1000">
								<span className="size-[7px] flex-none rounded-full bg-current" />
								Data diperbarui
							</span>
							<span className="font-mono text-body-sm leading-none font-medium text-ink-700">
								{dataChange.from}
							</span>
							<Icon name="chevron-right" size={16} />
							<span className="font-mono text-body-sm leading-none font-medium text-ink-1000">
								{dataChange.to}
							</span>
						</div>
						{dataChange.items.map((item) => (
							<Item key={item.title} title={item.title}>
								{item.note}
							</Item>
						))}
						<Item title="1 fakta berubah status">
							Terverifikasi
							<span className="mx-1.5 inline-block align-[-3px]">
								<Icon name="arrow-right" size={14} />
							</span>
							Diperdebatkan
						</Item>
					</div>
				</div>
				<aside className="flex min-w-0 flex-col gap-5">
					<div className="flex min-w-0 flex-col gap-3">
						<Callout tone="success" label="Progres">
							ID soal tidak pernah dipakai ulang, jadi riwayat belajar tidak berpindah
							wilayah. Kode yang hilang dari data dinonaktifkan, bukan dihapus.
						</Callout>
						<Button block onClick={onClose}>
							Tutup
						</Button>
						<Button variant="outline" block href="/referensi">
							Lihat kode terdampak
						</Button>
					</div>
				</aside>
			</div>
		</>
	);
}
