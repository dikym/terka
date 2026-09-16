import { Download, Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { LabelText } from "@/components/ui/label-text";

const backupWarning = {
	title: "Cadangan terakhir sudah lebih dari 14 hari.",
	body: "Lebih dari 14 hari. Data belajar hanya tersimpan di perangkat ini, jadi berkas cadangan adalah satu-satunya salinan."
};

const destination = [
	{ label: "folder", value: "iCloud Drive / Terka" },
	{ label: "izin", value: "directory handle permanen" },
	{ label: "jadwal", value: "otomatis, mingguan" },
	{ label: "ukuran", value: "84 KB · 305 kartu" }
];

const history = [
	{ date: "2026-08-24", kind: "otomatis" },
	{ date: "2026-08-17", kind: "otomatis" },
	{ date: "2026-08-03", kind: "manual" }
];

export function Cadangan() {
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
					Cadangan
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="grid-cols-[minmax(0,1fr)_300px]"
					aside={
						<>
							<div className="flex flex-col gap-2">
								<LabelText>riwayat</LabelText>
								{history.map((entry) => (
									<div
										key={entry.date}
										className="border-ink-200 flex items-center justify-between gap-3 border-t py-2"
									>
										<span className="text-body-sm text-ink-1000 font-mono font-medium">
											{entry.date}
										</span>
										<LabelText>{entry.kind}</LabelText>
									</div>
								))}
							</div>
							<Callout title="Tanpa server">
								Tidak ada akun dan tidak ada sinkronisasi. Berkas cadangan ini
								satu-satunya salinan di luar perangkat.
							</Callout>
						</>
					}
				>
					<Callout
						tone="danger"
						className="border-ink-200"
						title={backupWarning.title}
						titleClassName="text-stop-700"
					>
						{backupWarning.body}
					</Callout>
					<Card accent="brand">
						<div className="p-4">
							<header className="mb-3">
								<CardTitle>Tujuan cadangan</CardTitle>
							</header>
							<div className="flex flex-col gap-3">
								{destination.map((item) => (
									<div
										key={item.label}
										className="flex items-center justify-between gap-3"
									>
										<LabelText>{item.label}</LabelText>
										<span className="text-body-sm text-ink-900 text-right">
											{item.value}
										</span>
									</div>
								))}
							</div>
						</div>
					</Card>
					<Button block iconRight={<Download className="size-4" aria-hidden />}>
						Perbarui cadangan
					</Button>
					<Button variant="secondary" block>
						Pulihkan cadangan
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
