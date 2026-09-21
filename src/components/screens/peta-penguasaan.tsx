"use client";
import { useLearning } from "@/components/learning/learning-provider";
import { buildHierarchy } from "@/lib/terka/content";
import { scopeStats } from "@/lib/terka/statistics";
import { percent, scopeName } from "@/lib/terka/practice";
import { islandGroup, groupStrokes } from "@/components/learning/presentation";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { IconButton } from "@/components/ui/icon-button";
import { LabelText } from "@/components/ui/label-text";
import { RingGauge } from "@/components/ui/ring-gauge";
import { MapPlaceholder } from "@/components/terka/map-placeholder";
import { islandGroupBackgroundClasses } from "@/components/terka/scope-node";

const rings = [
	{ dotClassName: "border-go-500", label: "lingkaran luar", detail: "lolos Level 1" },
	{ dotClassName: "border-caution-500", label: "lingkaran tengah", detail: "lolos Level 2" },
	{
		dotClassName: "border-stop-500",
		label: "lingkaran dalam",
		detail: "lolos Level 3 — syarat Dikuasai"
	}
];

export function PetaPenguasaan() {
	const { content, progress } = useLearning();
	const router = useRouter();
	const national = scopeStats(progress, content, { level: "national", id: "indonesia" });
	const mastery = {
		percent: percent(national.mastery),
		note: `${national.matureCards} dari ${national.totalCards} kartu Dikuasai`
	};
	const groups = buildHierarchy(content)
		.filter((node) => node.level === "group")
		.map((node) => {
			const stats = scopeStats(progress, content, node);
			return {
				key: islandGroup(node.id),
				name: scopeName(content, node),
				strokeClassName: groupStrokes[islandGroup(node.id)],
				levels: stats.levels.map((level) =>
					level.total ? (level.passed / level.total) * 100 : 0
				),
				status: stats.mastered
					? "Dikuasai"
					: stats.confusions.length
						? `${stats.confusions.length} pasangan tertukar`
						: stats.answered
							? `${percent(stats.mastery)} dikuasai`
							: "belum dibuka"
			};
		});
	const regions = groups;

	return (
		<>
			<header className="flex items-center border-b border-ink-200 bg-paper-0 px-5 py-4">
				<PageTitle
					back="/statistik"
					size="sm"
					className="flex-1"
					actions={
						<IconButton label="Setelan" onClick={() => router.push("/setelan")}>
							<Settings className="size-4.5" aria-hidden />
						</IconButton>
					}
				>
					Peta Penguasaan
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="lg:grid-cols-[minmax(0,1fr)_320px]"
					aside={
						<>
							<Card>
								<CardBody>
									<header className="flex items-center gap-3">
										<RingGauge
											size={52}
											strokeWidth={5}
											gap={3}
											rings={[
												{ value: 100, className: "stroke-go-500" },
												{ value: 100, className: "stroke-caution-500" },
												{ value: 100, className: "stroke-stop-500" }
											]}
										/>
										<h3 className="font-display text-subhead font-semibold text-ink-1000">
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
													className={`mt-0.5 size-3.5 shrink-0 rounded-full border-3 ${ring.dotClassName}`}
												/>
												<span className="flex flex-col gap-0.5">
													<LabelText>{ring.label}</LabelText>
													<span className="text-body-sm leading-[1.3] text-ink-900">
														{ring.detail}
													</span>
												</span>
											</div>
										))}
									</div>
								</CardBody>
							</Card>
							<div className="flex flex-col gap-2">
								{regions.map((region) => (
									<div
										key={region.key}
										className="flex items-center gap-3 rounded-sm border border-ink-200 p-3"
									>
										<span
											aria-hidden
											className={`size-2.5 shrink-0 rounded-full ${islandGroupBackgroundClasses[region.key]}`}
										/>
										<span className="flex-1 font-display text-body-md leading-[1.2] font-semibold">
											{region.name}
										</span>
										<span className="font-mono text-micro leading-none font-medium text-ink-500">
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
							<span className="font-display text-display font-bold text-ink-1000 tabular-nums">
								{mastery.percent}
							</span>
							<span className="font-mono text-body-sm font-medium text-ink-500">
								{mastery.note}
							</span>
						</div>
					</div>
					<MapPlaceholder note="Peta SVG statis Indonesia" className="aspect-auto h-50" />
					<div className="grid grid-cols-3 gap-3">
						{groups.map((group) => (
							<div key={group.key} className="flex flex-col items-center gap-2">
								<RingGauge
									size={76}
									viewBoxSize={88}
									strokeWidth={6}
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
