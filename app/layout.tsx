import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

const noindex = process.env.NEXT_PUBLIC_NOINDEX === "1";

export const metadata: Metadata = {
  title: "kosmotale",
  description: "From Earth to the edge of the observable universe. The star data are non-commercial.",
  // Temporary noindex for the /kosmotale/ deploy (NEXT_PUBLIC_NOINDEX=1).
  ...(noindex
    ? { robots: { index: false, follow: false } }
    : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#03040c] text-[#f3eadc]">{children}</body>
    </html>
  );
}
