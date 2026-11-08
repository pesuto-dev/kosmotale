import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kosmotale",
  description: "Van de aarde tot de rand van het waarneembare heelal. De sterdata zijn niet-commercieel.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className="dark h-full antialiased">
      <body className="min-h-full bg-[#03040c] text-[#f3eadc]">{children}</body>
    </html>
  );
}
