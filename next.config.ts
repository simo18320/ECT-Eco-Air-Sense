import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nprvpiwvkdwywktfjixo.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // AirCare exports and GA plan images can run several MB; matches the
      // per-action MAX_FILE_SIZE checks in the import and GA plan upload actions.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
