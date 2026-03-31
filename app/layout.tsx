import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hearthstone Battlegrounds Leaderboard",
    template: "%s | HS BG Leaderboard",
  },
  description: "Track top Hearthstone Battlegrounds players across EU, US, and AP regions. Live MMR rankings, player stats, and Twitch stream status.",
  keywords: ["Hearthstone", "Battlegrounds", "Leaderboard", "MMR", "Ranking", "Blizzard"],
  authors: [{ name: "HS BG Leaderboard" }],
  openGraph: {
    title: "Hearthstone Battlegrounds Leaderboard",
    description: "Live MMR rankings for top Hearthstone Battlegrounds players across all regions.",
    type: "website",
    locale: "en_US",
    siteName: "HS BG Leaderboard",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearthstone Battlegrounds Leaderboard",
    description: "Live MMR rankings for top Hearthstone Battlegrounds players across all regions.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
