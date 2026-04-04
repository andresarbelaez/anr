import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native ffmpeg binary resolvable at runtime (avoid bundled /ROOT/... placeholder path).
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
