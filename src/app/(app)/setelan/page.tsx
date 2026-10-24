"use client";

import { Setelan } from "@/components/screens/setelan";
import { settings } from "@/dummy/settings";
import { useDummy } from "@/dummy/use-dummy";

export default function Page() {
	return <Setelan data={useDummy(settings)} />;
}
