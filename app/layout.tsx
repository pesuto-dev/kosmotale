import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kosmotale",
  description: "From Earth to the edge of the observable universe. The star data are non-commercial.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#03040c] text-[#f3eadc]">{children}</body>
    </html>
  );
}
