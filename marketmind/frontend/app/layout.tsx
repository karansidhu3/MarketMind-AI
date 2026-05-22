import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MarketMind AI",
  description: "AI-powered investment intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
