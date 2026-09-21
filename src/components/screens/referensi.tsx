"use client";
import { useState } from "react";
import { useLearning } from "@/components/learning/learning-provider";
import { searchReference } from "@/lib/terka/statistics";
import { verified } from "@/lib/terka/content";
import { scopeName } from "@/lib/terka/practice";
import { islandGroup } from "@/components/learning/presentation";
import { Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/tag";
import { LabelText } from "@/components/ui/label-text";
import { CodeBadge } from "@/components/terka/code-badge";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { cn } from "@/lib/utils";

export function Referensi() {
	const { content, progress } = useLearning();
	const [query, setQuery] = useState("");
	const results = searchReference(
		content,
		query,
		query ? { level: "national", id: "indonesia" } : progress.activeScope
	);
	const region = {
		group: query ? "Hasil pencarian" : scopeName(content, progress.activeScope),
		iconClass: "text-group-balinusra"
	};
	const entries = results.regions.map((entry) => ({
		code: entry.code,
		name: entry.region,
		cities: entry.areas.map((area) => area.name),
		group: islandGroup(entry.group),
		status: verified(entry)
			? "verified"
			: entry.confidence === "low"
				? "unverified-strong"
				: "unverified"
	}));
	const statusLabel = "Belum terverifikasi penuh";

	return (
		<PageFrame>
			<PageTitle>Referensi</PageTitle>
			<div className="flex flex-col gap-5">
				<Input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Cari kode atau wilayah…"
					aria-label="Cari kode atau wilayah"
				/>
				<div className="flex items-center gap-2">
					<Layers className={cn("size-4 shrink-0", region.iconClass)} aria-hidden />
					<LabelText>{region.group}</LabelText>
				</div>
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					{entries.map((entry) => (
						<div
							key={entry.code}
							className="flex min-h-11 items-center gap-3 rounded-sm border border-ink-200 bg-paper-0 p-3"
						>
							<CodeBadge code={entry.code} group={entry.group} />
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="text-body-md leading-[1.2] font-medium text-ink-1000">
									{entry.name}
								</span>
								{entry.cities.length > 0 ? (
									<span className="flex flex-wrap gap-1">
										{entry.cities.map((city) => (
											<Tag
												key={city}
												className="gap-2 rounded-sm border-ink-1000 px-1.5 text-micro leading-[1.2] whitespace-nowrap text-ink-1000"
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
				<span className="font-body text-body-sm leading-normal text-ink-500">
					{entries.length
						? `${entries.length} kode wilayah ditampilkan. Kode khusus RI, CD, dan CC hanya untuk referensi.`
						: "Tidak ada kode atau lokasi yang cocok."}
				</span>
			</div>
		</PageFrame>
	);
}
