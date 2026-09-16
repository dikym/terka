import { Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { IconButton } from "@/components/ui/icon-button";
import { LabelText } from "@/components/ui/label-text";
import { RingGauge } from "@/components/ui/ring-gauge";
import { MapPlaceholder } from "@/components/terka/map-placeholder";
import { groupDotClass, type IslandGroup } from "@/components/terka/scope-node";

const mastery = { percent: "41%", note: "126 dari 305 kartu Dikuasai" };

const rings = [
	{ dotClassName: "border-go-500", label: "lingkaran luar", detail: "lolos Level 1" },
	{ dotClassName: "border-caution-500", label: "lingkaran tengah", detail: "lolos Level 2" },
	{
		dotClassName: "border-stop-500",
		label: "lingkaran dalam",
		detail: "lolos Level 3 — syarat Dikuasai"
	}
];

const groups: {
	key: IslandGroup;
	name: string;
	strokeClassName: string;
	levels: [number, number, number];
}[] = [
	{
		key: "balinusra",
		name: "Bali & Nusra",
		strokeClassName: "stroke-group-balinusra",
		levels: [92, 74, 48]
	},
	{ key: "jawa", name: "Jawa", strokeClassName: "stroke-group-jawa", levels: [70, 45, 18] },
	{
		key: "maluku",
		name: "Maluku",
		strokeClassName: "stroke-group-maluku",
		levels: [100, 100, 100]
	}
];

const regions: { key: IslandGroup; name: string; status: string }[] = [
	{ key: "maluku", name: "Maluku", status: "Dikuasai" },
	{ key: "balinusra", name: "Bali & Nusa Tenggara", status: "1 pasangan sering tertukar" },
	{ key: "papua", name: "Papua", status: "belum dibuka" }
];

export function PetaPenguasaan() {
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
					Peta Penguasaan
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="grid-cols-[minmax(0,1fr)_320px]"
					aside={
						<>
							<section className="border-ink-200 bg-paper-0 shadow-lift overflow-hidden rounded-md border">
								<div className="flex flex-col gap-3 p-4">
									<header className="flex items-center gap-3">
										<RingGauge
											size={52}
											stroke={5}
											gap={3}
											rings={[
												{ value: 100, className: "stroke-go-500" },
												{ value: 100, className: "stroke-caution-500" },
												{ value: 100, className: "stroke-stop-500" }
											]}
										/>
										<h3 className="font-display text-subhead text-ink-1000 font-semibold">
											Tiga lingkaran
										</h3>
									</header>
									<div className="flex flex-col gap-3">
										{rings.map((ring) => (
											<div
												key={ring.label}
												className="flex items-start gap-3"
											>
												<span
													aria-hidden
													className={`mt-0.5 size-[14px] shrink-0 rounded-full border-[3px] ${ring.dotClassName}`}
												/>
												<span className="flex flex-col gap-0.5">
													<LabelText>{ring.label}</LabelText>
													<span className="text-body-sm text-ink-900">
														{ring.detail}
													</span>
												</span>
											</div>
										))}
									</div>
								</div>
							</section>
							<div className="flex flex-col gap-2">
								{regions.map((region) => (
									<div
										key={region.key}
										className="border-ink-200 flex items-center gap-3 rounded-sm border p-3"
									>
										<span
											aria-hidden
											className={`size-[10px] shrink-0 rounded-full ${groupDotClass[region.key]}`}
										/>
										<span className="font-display text-body-md flex-1 leading-[1.2] font-semibold">
											{region.name}
										</span>
										<span className="text-micro text-ink-500 font-mono font-medium">
											{region.status}
										</span>
									</div>
								))}
							</div>
						</>
					}
				>
					<div className="flex flex-col gap-1">
						<LabelText>penguasaan nasional</LabelText>
						<div className="flex items-baseline gap-2">
							<span className="font-display text-display text-ink-1000 font-bold tabular-nums">
								{mastery.percent}
							</span>
							<span className="text-body-sm text-ink-500 font-mono font-medium">
								{mastery.note}
							</span>
						</div>
					</div>
					<MapPlaceholder
						note="Peta SVG statis Indonesia"
						className="aspect-auto h-[200px]"
					/>
					<div className="grid grid-cols-3 gap-3">
						{groups.map((group) => (
							<div key={group.key} className="flex flex-col items-center gap-2">
								<RingGauge
									size={76}
									stroke={6}
									gap={2}
									rings={group.levels.map((value) => ({
										value,
										className: group.strokeClassName
									}))}
								/>
								<LabelText className="text-center">{group.name}</LabelText>
							</div>
						))}
					</div>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
