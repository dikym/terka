import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";

type Confidence = "terverifikasi" | "diperdebatkan" | "legenda";

const confidenceBadgeClass: Record<Confidence, string> = {
	terverifikasi: "bg-go-100 text-fact-verified",
	diperdebatkan: "bg-caution-100 text-fact-disputed",
	legenda: "bg-grape-100 text-fact-legend"
};

export function FactCard({
	confidence,
	source,
	className,
	children
}: {
	confidence: Confidence;
	source: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<Card className={className}>
			<CardBody>
				<span
					className={cn(
						"rounded-pill font-display text-label self-start px-2.5 py-1 font-semibold uppercase",
						confidenceBadgeClass[confidence]
					)}
				>
					{confidence}
				</span>
				<p className="font-body text-body-md text-ink-900 leading-loose">{children}</p>
				<cite className="font-body text-body-sm text-ink-500 leading-[1.4] italic">
					{source}
				</cite>
			</CardBody>
		</Card>
	);
}
