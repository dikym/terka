import Link from "next/link";
import { ArrowLeft, Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { LabelText } from "@/components/ui/label-text";
import { IconButton } from "@/components/ui/icon-button";
import { CodeBadge } from "@/components/terka/code-badge";
import { PageFrame } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { ModeBadge } from "./bandingkan";

const region = { name: "Jawa Barat", meta: "Provinsi · 3 kode · 18 kartu" };

const codes = [
	{ code: "D", name: "Bandung", percent: "62%" },
	{ code: "E", name: "Cirebon", percent: "40%" },
	{ code: "Z", name: "Priangan Timur", percent: "25%" }
];

const due = { count: 4, note: "soal — juga dihitung untuk jadwal hari ini" };

export function LatihanTerfokus() {
	return (
		<>
			<header className="border-ink-200 bg-paper-0 flex items-center justify-between border-b px-8 py-4">
				<div className="flex items-center gap-3">
					<Link
						href="/"
						aria-label="Kembali"
						className="size-control-sm text-ink-700 hover:bg-paper-50 inline-flex items-center justify-center rounded-sm"
					>
						<ArrowLeft className="size-[18px]" aria-hidden />
					</Link>
					<span className="font-display text-subhead text-ink-1000 font-semibold">
						Latihan Terfokus
					</span>
				</div>
				<IconButton label="Setelan">
					<Settings className="size-[18px]" aria-hidden />
				</IconButton>
			</header>
			<PageFrame>
				<TwoColumn
					className="grid-cols-[minmax(0,1fr)_300px]"
					aside={
						<>
							<Callout
								tone="warn"
								className="border-ink-200"
								title={<span className="text-warn-700">Jadwal tidak berubah</span>}
							>
								Latihan tambahan. Jawabannya dicatat untuk statistik dan kode yang
								sering tertukar, tetapi jadwal kartu yang belum perlu diulang tidak
								berubah.
							</Callout>
							<div className="flex flex-col gap-1 px-1">
								<LabelText>perlu diulang di wilayah ini</LabelText>
								<div className="flex items-baseline gap-2">
									<span className="text-subhead text-ink-1000 font-mono leading-none font-bold tabular-nums">
										{due.count}
									</span>
									<span className="text-body-sm text-ink-500 leading-[1.3]">
										{due.note}
									</span>
								</div>
							</div>
						</>
					}
				>
					<div className="flex flex-col gap-2">
						<ModeBadge tone="bg-info-100 text-ink-1000">Latihan Terfokus</ModeBadge>
						<h2 className="font-display text-title text-ink-1000 font-bold">
							{region.name}
						</h2>
						<span className="text-body-sm text-ink-500 font-mono font-medium">
							{region.meta}
						</span>
					</div>
					<div className="flex flex-col gap-2">
						{codes.map((row) => (
							<div
								key={row.code}
								className="border-ink-200 bg-paper-0 flex items-center gap-3 rounded-sm border p-3"
							>
								<CodeBadge code={row.code} group="jawa" size="sm" />
								<span className="text-body-md text-ink-900 flex-1 leading-[1.3]">
									{row.name}
								</span>
								<span className="text-micro text-ink-500 font-mono font-medium">
									{row.percent}
								</span>
							</div>
						))}
					</div>
					<Button
						variant="secondary"
						block
						iconRight={<Target className="size-4" aria-hidden />}
					>
						Latih wilayah ini
					</Button>
					<Button variant="ghost" size="sm" block>
						Pilih wilayah ini
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
