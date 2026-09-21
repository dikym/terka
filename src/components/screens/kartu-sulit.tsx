"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLearning } from "@/components/learning/learning-provider";
import { setCardSuspended } from "@/lib/terka/engine";
import { ArrowRight, Settings } from "lucide-react";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { StatBlock } from "@/components/ui/stat-block";
import { CardStateBadge } from "@/components/terka/card-state-badge";

export function KartuSulit() {
	const { progress, content, busy, act } = useLearning();
	const router = useRouter();
	const [selected, setSelected] = useState<string | null>(null);
	const cards = progress.cards.filter((card) => card.lapses >= 6 || card.state === "suspended");
	const counters = [
		{
			value: String(cards.filter((card) => card.state !== "suspended").length),
			label: "Sulit Dikuasai",
			valueClassName: "text-state-leech"
		},
		{
			value: String(cards.filter((card) => card.state === "suspended").length),
			label: "Dinonaktifkan",
			valueClassName: "text-state-suspended"
		}
	];
	const rows = cards.map((card) => ({
		id: card.cardId,
		prefix: `${content.regions.find((region) => region.id === card.regionId)?.code} · ${card.mode}`,
		arrow: false,
		after: "",
		state: card.state === "suspended" ? ("suspended" as const) : ("leech" as const),
		detail:
			card.state === "suspended"
				? "menunggu tinjauan manual"
				: "konteks kini tampil sebelum jawaban",
		count: `${card.lapses} kali terlewat`
	}));
	const selectedCard =
		cards.find((card) => card.cardId === selected) ??
		cards.find((card) => card.state === "suspended");

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
					Sulit Dikuasai
				</PageTitle>
			</header>
			<PageFrame>
				<TwoColumn
					className="lg:grid-cols-[minmax(0,1fr)_300px]"
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
								key={row.id}
								role="button"
								tabIndex={0}
								aria-pressed={selectedCard?.cardId === row.id}
								onClick={() => setSelected(row.id)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										setSelected(row.id);
									}
								}}
								className="flex flex-col gap-2 rounded-sm border border-ink-200 bg-paper-0 p-3"
							>
								<div className="flex items-center justify-between gap-3">
									<span className="inline-flex items-center gap-1 font-mono text-body-md text-ink-1000">
										{row.prefix}
										{row.arrow ? (
											<ArrowRight className="size-[0.9em]" aria-hidden />
										) : null}
										{row.after}
									</span>
									<CardStateBadge state={row.state} />
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-body-sm leading-[1.4] text-ink-500">
										{row.detail}
									</span>
									<span className="font-mono text-micro leading-none font-medium text-stop-700">
										{row.count}
									</span>
								</div>
							</div>
						))}
					</div>
					<Button
						disabled={busy || selectedCard?.state !== "suspended"}
						title={
							selectedCard
								? `Aktifkan ${selectedCard.cardId}`
								: "Belum ada kartu dinonaktifkan"
						}
						onClick={() => {
							if (selectedCard)
								void act((current, data) =>
									setCardSuspended(
										current,
										data,
										selectedCard.cardId,
										false,
										Date.now()
									)
								);
						}}
						variant="secondary"
						block
					>
						Aktifkan kembali
						{selectedCard
							? ` · ${content.regions.find((region) => region.id === selectedCard.regionId)?.code}`
							: ""}
					</Button>
					<Button
						onClick={() => router.push("/statistik")}
						variant="ghost"
						size="sm"
						block
					>
						Biarkan dinonaktifkan
					</Button>
				</TwoColumn>
			</PageFrame>
		</>
	);
}
