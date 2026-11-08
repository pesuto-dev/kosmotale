import type { NextConfig } from "next";

// Leeg tenzij de host een subpad nodig heeft. Geen repositorynaam hard coderen.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  // De dev-server luistert op 0.0.0.0; de browser komt via localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
