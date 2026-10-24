"use client";

import { Analytics } from "@vercel/analytics/next";
import { beforeSend } from "@/lib/analytics";

export function PageViews() {
	return <Analytics beforeSend={beforeSend} />;
}
