import { ArrowRight, Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { StatBlock } from "@/components/ui/stat-block";
import { CardStateBadge, type CardState } from "@/components/terka/card-state-badge";

const counters = [
	{ value: "3", label: "Sulit Dikuasai", valueClassName: "text-state-leech" },
	{ value: "2", label: "Dinonaktifkan otomatis", valueClassName: "text-state-suspended" }
];

type LeechRow = {
	prefix: string;
	arrow?: boolean;
	after?: string;
	state: CardState;
	detail: string;
	count: string;
};

const rows: LeechRow[] = [
	{
		prefix: "BD · kode",
		arrow: true,
		after: "wilayah",
		state: "leech",
		detail: "konteks kini tampil sebelum jawaban",
		count: "6 kali terlewat"
	},
	{
		prefix: "DL · kode",
		arrow: true,
		after: "wilayah",
		state: "leech",
		detail: "konteks kini tampil sebelum jawaban",
		count: "7 kali terlewat"
	},
	{
		prefix: "DN · Tanpa Petunjuk",
		state: "suspended",
		detail: "menunggu tinjauan manual",
		count: "8 kali terlewat"
	},
	{
		prefix: "DC · kode belakang",
		state: "suspended",
		detail: "data perlu diverifikasi",
		count: "8 kali terlewat"
	}
];

export function KartuSulit() {
	return (
		<>
			<header className="border-ink-200 bg-paper-0 flex items-center border-b px-5 py-4">
				<PageTitle
					back="/statistik"
					size="sm"
					className="flex-1"
					actions={
						<IconButton label="Setelan">
							<Settings className="size-[18px]" aria-hidden />
						</IconButton>
					}
				>
					Sulit Dikuasai
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="grid-cols-[minmax(0,1fr)_300px]"
					aside={
						<Callout
							tone="warn"
							className="border-ink-200"
							title="Kenapa ini ada"
							titleClassName="text-warn-700"
						>
							Kartu yang terus terlewat tanpa jawaban salah yang konsisten tidak punya
							pasangan untuk dibandingkan. Dibiarkan, ia menyita antrean harian.
						</Callout>
					}
				>
					<div className="grid grid-cols-2 gap-5">
						{counters.map((counter) => (
							<StatBlock
								key={counter.label}
								value={counter.value}
								label={counter.label}
								valueClassName={counter.valueClassName}
							/>
						))}
					</div>
					<div className="flex flex-col gap-2">
						{rows.map((row) => (
							<div
								key={row.prefix}
								className="border-ink-200 bg-paper-0 flex flex-col gap-2 rounded-sm border p-3"
							>
								<div className="flex items-center justify-between gap-3">
									<span className="text-body-md text-ink-1000 inline-flex items-center gap-1 font-mono">
										{row.prefix}
										{row.arrow ? (
											<ArrowRight className="size-[0.9em]" aria-hidden />
										) : null}
										{row.after}
									</span>
									<CardStateBadge state={row.state} />
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-body-sm text-ink-500">{row.detail}</span>
									<span className="text-micro text-stop-700 font-mono font-medium">
										{row.count}
									</span>
								</div>
							</div>
						))}
					</div>
					<Button variant="secondary" block>
						Aktifkan kembali
					</Button>
					<Button variant="ghost" size="sm" block>
						Biarkan dinonaktifkan
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
