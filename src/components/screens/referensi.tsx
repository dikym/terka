import { Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/tag";
import { LabelText } from "@/components/ui/label-text";
import { CodeBadge } from "@/components/terka/code-badge";
import type { IslandGroup } from "@/components/terka/scope-node";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { cn } from "@/lib/utils";

const region: { group: string; islandGroup: IslandGroup; iconClass: string } = {
	group: "Bali & Nusa Tenggara",
	islandGroup: "balinusra",
	iconClass: "text-group-balinusra"
};

const entries = [
	{
		code: "DK",
		name: "Bali",
		cities: ["Denpasar", "Pulau Bali"],
		status: "verified" as const
	},
	{ code: "DR", name: "Lombok", cities: ["NTB"], status: "verified" as const },
	{ code: "EA", name: "Sumbawa", cities: [], status: "unverified" as const },
	{ code: "ED", name: "Sumba", cities: [], status: "unverified" as const },
	{ code: "DH", name: "Timor", cities: ["Kupang"], status: "verified" as const },
	{ code: "EB", name: "Flores", cities: ["Ende"], status: "unverified-strong" as const }
];

const statusLabel = "Belum terverifikasi penuh";

export function Referensi() {
	return (
		<PageFrame>
			<PageTitle>Referensi</PageTitle>
			<div className="flex flex-col gap-5">
				<Input placeholder="Cari kode atau wilayah…" />
				<div className="flex items-center gap-2">
					<Layers className={cn("size-4 shrink-0", region.iconClass)} aria-hidden />
					<LabelText>{region.group}</LabelText>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{entries.map((entry) => (
						<div
							key={entry.code}
							className="border-ink-200 bg-paper-0 flex min-h-11 items-center gap-3 rounded-sm border p-3"
						>
							<CodeBadge code={entry.code} group={region.islandGroup} />
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="text-body-md text-ink-1000 leading-[1.2] font-medium">
									{entry.name}
								</span>
								{entry.cities.length > 0 ? (
									<span className="flex flex-wrap gap-1">
										{entry.cities.map((city) => (
											<Tag
												key={city}
												className="border-ink-1000 text-micro text-ink-1000 gap-2 rounded-sm px-1.5 leading-[1.2] whitespace-nowrap"
											>
												{city}
											</Tag>
										))}
									</span>
								) : null}
							</span>
							{entry.status === "verified" ? (
								<Badge tone="success" className="self-start">
									Masuk latihan
								</Badge>
							) : entry.status === "unverified-strong" ? (
								<Badge tone="danger" className="self-start">
									{statusLabel}
								</Badge>
							) : (
								<Badge tone="warn" className="self-start">
									{statusLabel}
								</Badge>
							)}
						</div>
					))}
				</div>
				<span className="text-body-sm text-ink-500 font-body leading-[1.5]">
					Entri yang belum terverifikasi penuh tersedia di Referensi, belum masuk latihan.
				</span>
			</div>
		</PageFrame>
	);
}
