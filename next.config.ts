import type { NextConfig } from "next";

function supabaseStorageImagePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const u = new URL(raw);
    const protocol =
      u.protocol === "http:"
        ? "http"
        : u.protocol === "https:"
          ? "https"
          : null;
    if (!protocol) return [];
    return [
      {
        protocol,
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/storage/v1/object/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStorageImagePatterns(),
  },
  // Phone / LAN browser hits http://<this-machine-ip>:3000 — allow HMR and other dev-only
  // assets (blocked by default vs localhost). Add or change IPs when your network changes.
  allowedDevOrigins: ["192.168.0.244"],
  // Keep native ffmpeg binary resolvable at runtime (avoid bundled /ROOT/... placeholder path).
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    /** Tree-shake icon imports — smaller client bundles (icons are used widely in the app). */
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
