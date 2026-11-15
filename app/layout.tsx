import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

const noindex = process.env.NEXT_PUBLIC_NOINDEX === "1";

export const metadata: Metadata = {
  title: "kosmotale",
  description: "Van de aarde tot de rand van het waarneembare heelal. De sterdata zijn niet-commercieel.",
  // Temporary: drop this once the pesuto.dev case study is live and links here.
  ...(noindex
    ? { robots: { index: false, follow: false } }
    : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className="dark h-full antialiased">
      <body className="min-h-full bg-[#03040c] text-[#f3eadc]">{children}</body>
    </html>
  );
}
