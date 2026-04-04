import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Disable service worker during development to avoid stale cache confusion
  disable: process.env.NODE_ENV === "development",
  // Cache navigations aggressively for offline capability
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Silence the Turbopack error since we use the PWA webpack plugin
  turbopack: {},
};

export default withPWA(nextConfig);
