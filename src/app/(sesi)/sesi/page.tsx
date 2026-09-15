import { notFound } from "next/navigation";
import { sesiScreens, type SesiScreenKey } from "@/components/screens/sesi-registry";

export default async function Page({
	searchParams
}: {
	searchParams: Promise<{ screen?: string }>;
}) {
	const { screen = "tanya" } = await searchParams;
	const Screen = sesiScreens[screen as SesiScreenKey];
	if (!Screen) notFound();
	return <Screen />;
}
