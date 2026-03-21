import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    importScripts: ['/sw-custom.js'],
  }
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  turbopack: {},
};

export default withPWA(nextConfig);
