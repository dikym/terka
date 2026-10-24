"use client";

import { Statistik } from "@/components/screens/statistik";
import { stats } from "@/dummy/stats";
import { useDummy } from "@/dummy/use-dummy";

export default function Page() {
	return <Statistik data={useDummy(stats)} />;
}
