import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
		<Card className={cn("shadow-none", className)}>
			<CardBody>
				<Badge className={cn("self-start", confidenceBadgeClass[confidence])}>
					{confidence}
				</Badge>
				<p className="font-body text-body-md leading-loose text-ink-900">{children}</p>
				<cite className="font-body text-body-sm leading-[1.4] text-ink-500 italic">
					{source}
				</cite>
			</CardBody>
		</Card>
	);
}
