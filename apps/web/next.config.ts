import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
});

const nextConfig: NextConfig = {
  // Use standard Webpack for stability during UI dev
  turbopack: {},
};

export default withPWA(nextConfig);
