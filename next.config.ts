import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	trailingSlash: false,
	images: { unoptimized: true },
	allowedDevOrigins: ["*.trycloudflare.com"]
};

export default nextConfig;
