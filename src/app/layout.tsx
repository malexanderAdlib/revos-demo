import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adlib · RevOS",
  description: "RevOS intelligence workspace — your whole book, every tool, one workspace.",
};

// RevOS is LIGHT-ONLY (blue & white), like the real app — data-theme="light" is
// stamped on <html> so a dark-mode viewer never gets a navy repaint.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
