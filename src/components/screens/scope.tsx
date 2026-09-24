"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLearning } from "@/components/learning/learning-provider";
import { islandGroup } from "@/components/learning/presentation";
import { buildHierarchy } from "@/lib/terka/content";
import { scopeStats } from "@/lib/terka/statistics";
import { scopeName, percent } from "@/lib/terka/practice";
import { selectScope } from "@/lib/terka/engine";
import type { Scope } from "@/lib/terka/model";
import { Button } from "@/components/ui/button";
import { LabelText } from "@/components/ui/label-text";
import { Card, CardTitle } from "@/components/ui/card";
import { PageFrame, PageTitle } from "@/components/layout/page-frame";
import { TwoColumn } from "@/components/layout/two-column";
import { ScopeTree, ScopeNode } from "@/components/terka/scope-node";

export function ScopeScreen() {
	const { progress, content, busy, act } = useLearning();
	const router = useRouter();
	const [selected, setSelected] = useState<Scope>(progress.activeScope);
	const [expanded, setExpanded] = useState<string[]>([
		"group:" +
			(content.regions.find((region) => region.id === progress.activeScope.id)?.group ??
				progress.activeScope.id)
	]);
	const nodes = buildHierarchy(content);
	const same = (scope: Scope, other: Scope) =>
		scope.level === other.level && scope.id === other.id;
	function choose(scope: Scope) {
		setSelected({ level: scope.level, id: scope.id });
		const key = `${scope.level}:${scope.id}`;
		setExpanded((values) =>
			values.includes(key) ? values.filter((value) => value !== key) : [...values, key]
		);
	}
	function rows(
		parent: string,
		depth: number
	): {
		scope: Scope;
		name: string;
		count: string;
		percent: string;
		group: ReturnType<typeof islandGroup>;
		expanded: boolean;
		active: boolean;
		leaf: boolean;
		highlighted: boolean;
		mono: boolean;
		depth: number;
	}[] {
		return nodes
			.filter((node) => node.parent === parent)
			.flatMap((node) => {
				const key = `${node.level}:${node.id}`;
				const stats = scopeStats(progress, content, node);
				const open = expanded.includes(key);
				return [
					{
						scope: node,
						name:
							node.level === "code"
								? content.regions.find((region) => region.id === node.id)!.code
								: scopeName(content, node),
						count: `${stats.totalCards} kartu`,
						percent: percent(stats.mastery),
						group: islandGroup(
							content.regions.find((region) => region.id === node.regionIds[0])!.group
						),
						expanded: open,
						active: same(node, progress.activeScope),
						leaf: node.level === "code",
						highlighted: same(node, selected),
						mono: node.level === "code",
						depth
					},
					...(open ? rows(key, depth + 1) : [])
				];
			});
	}
	const tree = rows("national:indonesia", 0);
	const national: Scope = { level: "national", id: "indonesia" };
	const all = scopeStats(progress, content, national);
	const totalScope = { count: `${all.totalCards} kartu`, percent: percent(all.mastery) };
	const stats = scopeStats(progress, content, selected);
	const highlighted = {
		name: scopeName(content, selected),
		count: `${stats.totalCards} kartu`,
		fresh: `${stats.newCards} materi baru tersedia`
	};

	return (
		<PageFrame>
			<PageTitle>Cakupan</PageTitle>
			<TwoColumn
				className="lg:grid-cols-[minmax(0,1fr)_340px]"
				aside={
					<Card className="flex flex-col gap-3 border-2 border-ink-1000 p-4 shadow-block">
						<div className="flex items-baseline justify-between gap-3">
							<div className="flex flex-col items-start gap-1">
								<LabelText>Wilayah disorot</LabelText>
								<CardTitle>{highlighted.name}</CardTitle>
							</div>
							<span className="shrink-0 font-mono text-body-sm font-medium text-ink-500">
								{highlighted.count}
							</span>
						</div>
						<span className="text-body-md text-ink-900">{highlighted.fresh}</span>
						<div className="flex flex-col gap-2">
							<Button
								disabled={busy}
								onClick={() =>
									void act((current, data) =>
										selectScope(current, data, selected)
									)
								}
								variant="primary"
								size="md"
								block
								className="px-4"
							>
								Pilih wilayah ini
							</Button>
							<Button
								disabled={busy}
								onClick={() =>
									router.push(
										`/terfokus?level=${selected.level}&id=${encodeURIComponent(selected.id)}`
									)
								}
								variant="quiet"
								size="md"
								block
								className="border-ink-1000 px-4"
							>
								Latih wilayah ini
							</Button>
						</div>
						<span className="font-body text-body-sm leading-[1.4] text-ink-500">
							Menelusuri tidak mengubah Cakupan. Cakupan berganti setelah Pilih
							wilayah ini ditekan.
						</span>
					</Card>
				}
			>
				<ScopeTree>
					<ScopeNode
						name="Seluruh Indonesia"
						onClick={() => setSelected(national)}
						active={same(progress.activeScope, national)}
						highlighted={same(selected, national)}
						count={totalScope.count}
						percent={totalScope.percent}
						tree
						leaf
					/>
					{tree.map((item) => (
						<ScopeNode
							key={`${item.scope.level}:${item.scope.id}`}
							name={item.name}
							count={item.count}
							percent={item.percent}
							group={item.group}
							expanded={item.expanded}
							active={item.active}
							leaf={item.leaf}
							highlighted={item.highlighted}
							depth={item.depth}
							mono={item.mono}
							onClick={() => choose(item.scope)}
						/>
					))}
				</ScopeTree>
				<div className="flex flex-col gap-2 rounded-md border border-ink-200 bg-paper-50 p-4 text-ink-900">
					<LabelText tone="ink">Aturan</LabelText>
					<p className="text-body-md text-ink-900">
						Cakupan hanya menentukan materi baru mana yang boleh dipelajari. Soal yang
						perlu diulang tidak pernah disaring Cakupan.
					</p>
				</div>
			</TwoColumn>
		</PageFrame>
	);
}
