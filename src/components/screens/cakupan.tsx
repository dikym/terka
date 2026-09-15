import { Button } from "@/components/ui/button";
import { LabelText } from "@/components/ui/label-text";
import { CardTitle } from "@/components/ui/card";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { ScopeTree, ScopeNode, type IslandGroup } from "@/components/terka/scope-node";

type ScopeChild = {
	name: string;
	count: string;
	percent: string;
	group: IslandGroup;
	mono?: boolean;
};

type ScopeItem = {
	name: string;
	count: string;
	percent: string;
	group: IslandGroup;
	expanded?: boolean;
	active?: boolean;
	leaf?: boolean;
	children?: ScopeChild[];
};

const tree: ScopeItem[] = [
	{ name: "Sumatera", count: "61 kartu", percent: "8%", group: "sumatera" },
	{ name: "Jawa", count: "124 kartu", percent: "22%", group: "jawa" },
	{ name: "Kalimantan", count: "28 kartu", percent: "14%", group: "kalimantan", leaf: true },
	{ name: "Sulawesi", count: "49 kartu", percent: "4%", group: "sulawesi", leaf: true },
	{
		name: "Bali & Nusa Tenggara",
		count: "31 kartu",
		percent: "64%",
		group: "balinusra",
		expanded: true,
		active: true,
		children: [
			{ name: "DK", count: "6 kartu", percent: "88%", group: "balinusra", mono: true },
			{ name: "DR", count: "5 kartu", percent: "52%", group: "balinusra", mono: true },
			{ name: "EA", count: "5 kartu", percent: "40%", group: "balinusra", mono: true }
		]
	},
	{ name: "Maluku", count: "8 kartu", percent: "100%", group: "maluku", leaf: true },
	{ name: "Papua", count: "25 kartu", percent: "0%", group: "papua", leaf: true }
];

const totalScope = { count: "305 kartu", percent: 26 };

const highlighted = {
	name: "Kawasan Sumatera",
	count: "61 kartu",
	fresh: "8 materi baru tersedia"
};

export function Cakupan() {
	return (
		<PageFrame>
			<PageTitle>Cakupan</PageTitle>
			<div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<ScopeTree>
						{tree.flatMap((item) => [
							<ScopeNode
								key={item.name}
								name={item.name}
								count={item.count}
								percent={item.percent}
								group={item.group}
								expanded={item.expanded}
								active={item.active}
								leaf={item.leaf}
							/>,
							...(item.children ?? []).map((child) => (
								<ScopeNode
									key={`${item.name}-${child.name}`}
									name={child.name}
									count={child.count}
									percent={child.percent}
									group={child.group}
									depth={1}
									leaf
									mono={child.mono}
								/>
							))
						])}
					</ScopeTree>
					<div className="border-ink-200 bg-paper-50 text-ink-900 flex flex-col gap-2 rounded-md border p-4">
						<LabelText tone="ink">Aturan</LabelText>
						<p className="text-body-md text-ink-900">
							Cakupan hanya menentukan materi baru mana yang boleh dipelajari. Soal
							yang perlu diulang tidak pernah disaring Cakupan.
						</p>
					</div>
				</div>
				<aside className="sticky top-8 flex min-w-0 flex-col gap-4 self-start">
					<div className="border-ink-200 bg-paper-0 box-border flex min-h-11 items-center gap-3 rounded-sm border p-3">
						<span className="bg-ink-1000 size-2.5 shrink-0 rounded-full" aria-hidden />
						<span className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="flex items-baseline justify-between gap-2">
								<span className="font-display text-body-lg text-ink-1000 truncate leading-[1.2] font-semibold">
									Seluruh Indonesia
								</span>
								<span className="text-body-sm text-ink-500 shrink-0 font-mono">
									{totalScope.count}
								</span>
							</span>
							<span className="flex items-center gap-2">
								<span className="bg-ink-100 h-1.5 min-w-0 flex-1 overflow-hidden rounded-xs">
									<span
										className="bg-ink-1000 block h-full"
										style={{ width: `${totalScope.percent}%` }}
									/>
								</span>
								<span className="text-body-sm text-ink-900 w-9 shrink-0 text-right font-mono font-medium tabular-nums">
									{totalScope.percent}%
								</span>
							</span>
						</span>
					</div>
					<section className="border-ink-1000 bg-paper-0 shadow-block flex flex-col gap-3 rounded-md border-2 p-4">
						<div className="flex items-baseline justify-between gap-3">
							<div className="flex flex-col items-start gap-1">
								<LabelText>Wilayah disorot</LabelText>
								<CardTitle>{highlighted.name}</CardTitle>
							</div>
							<span className="text-body-sm text-ink-500 shrink-0 font-mono font-medium">
								{highlighted.count}
							</span>
						</div>
						<span className="text-body-md text-ink-900">{highlighted.fresh}</span>
						<div className="flex flex-col gap-2">
							<Button variant="primary" size="md" block>
								Pilih wilayah ini
							</Button>
							<Button variant="quiet" size="md" block className="border-ink-1000">
								Latih wilayah ini
							</Button>
						</div>
						<span className="text-body-sm text-ink-500 font-body leading-[1.4]">
							Menelusuri tidak mengubah Cakupan. Cakupan berganti setelah Pilih
							wilayah ini ditekan.
						</span>
					</section>
				</aside>
			</div>
		</PageFrame>
	);
}
