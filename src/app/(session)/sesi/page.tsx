import { LearningSession } from "@/components/learning/learning-session";
import { notFound } from "next/navigation";
import { sessionScreens, type SessionScreenKey } from "@/components/screens/session-registry";

export default async function Page({
	searchParams
}: {
	searchParams: Promise<{ screen?: string }>;
}) {
	const { screen } = await searchParams;
	if (!screen) return <LearningSession />;
	const Screen = sessionScreens[screen as SessionScreenKey];
	if (!Screen) notFound();
	return <Screen />;
}
