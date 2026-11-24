import { defineConfig } from "@pesuto/demotale";

export default defineConfig({
  baseUrl: "http://127.0.0.1:43127",
  scenarios: "./demo",
  output: "./demo/output",
  viewport: { width: 1440, height: 900 },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:43127",
    reuseExistingServer: true,
  },
  // The Next.js dev badge is not part of the product.
  redact: ["nextjs-portal"],
  video: { formats: ["mp4", "gif"], gifWidth: 720, gifFps: 10 },
  captions: { vtt: true, transcript: true },
  theme: { base: "dark", accent: "#f0d7a2" },
});
