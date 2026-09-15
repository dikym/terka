import Link from "next/link";
import { ChevronRight, Flame, Play, Target, Zap } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { LabelText } from "@/components/ui/label-text";
import { buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { PageFrame } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";

const beranda = {
	due: 12,
	streak: 12,
	scope: { name: "Kawasan Bali & Nusa Tenggara", mastered: 64, fresh: 10, outside: 148 }
};

export function Beranda() {
	return (
		<PageFrame>
			<TwoColumn
				aside={
					<div className="flex flex-col gap-3">
						<Link
							href="/sesi"
							className={buttonVariants({
								variant: "primary",
								size: "lg",
								block: true
							})}
						>
							<Play className="size-[18px]" aria-hidden />
							<span>Mulai belajar</span>
							<Kbd className="ml-1">Enter</Kbd>
						</Link>
						<Link
							href="/tantangan"
							className={buttonVariants({ variant: "stop", size: "md", block: true })}
						>
							<Target className="size-4" aria-hidden />
							<span>Tantangan Harian</span>
							<span className="text-micro font-mono font-medium opacity-70">
								5 soal
							</span>
						</Link>
						<Link
							href="/kilat"
							className={buttonVariants({
								variant: "confirm",
								size: "md",
								block: true
							})}
						>
							<Zap className="size-4" aria-hidden />
							<span>Mode Kilat</span>
							<span className="text-micro font-mono font-medium opacity-70">
								60 detik
							</span>
						</Link>
					</div>
				}
			>
				<div className="flex items-end justify-between">
					<div className="flex flex-col items-start gap-1">
						<div className="flex items-baseline gap-2">
							<span className="font-display text-hero text-ink-1000 font-bold tabular-nums">
								{beranda.due}
							</span>
							<span className="text-body-sm text-ink-500 font-mono font-medium">
								soal
							</span>
						</div>
						<LabelText>perlu diulang hari ini</LabelText>
					</div>
					<span className="text-ink-900 inline-flex items-center gap-1.5">
						<Flame className="text-tangerine-500 size-[18px] shrink-0" aria-hidden />
						<span className="text-subhead font-mono font-bold">{beranda.streak}</span>
						<LabelText>Hari Beruntun</LabelText>
					</span>
				</div>
				<Link href="/cakupan" className="block">
					<Card accent="balinusra">
						<div className="p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div className="flex flex-col items-start gap-1">
									<LabelText>Cakupan</LabelText>
									<CardTitle>{beranda.scope.name}</CardTitle>
								</div>
								<ChevronRight
									className="text-ink-900 size-[18px] shrink-0"
									aria-hidden
								/>
							</div>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<LabelText>materi Dikuasai</LabelText>
										<span className="text-label text-ink-900 font-mono font-semibold uppercase">
											{beranda.scope.mastered}%
										</span>
									</div>
									<div className="bg-ink-100 h-2 overflow-hidden rounded-xs">
										<div
											className="bg-group-balinusra h-full"
											style={{ width: `${beranda.scope.mastered}%` }}
										/>
									</div>
								</div>
								<div className="text-body-md text-ink-900 flex items-center justify-between">
									<span>{beranda.scope.fresh} materi baru tersedia</span>
									<span className="text-ink-500 font-mono">
										{beranda.scope.outside} di luar Cakupan
									</span>
								</div>
							</div>
						</div>
					</Card>
				</Link>
			</TwoColumn>
		</PageFrame>
	);
}
