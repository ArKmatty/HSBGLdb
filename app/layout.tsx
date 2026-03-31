import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { detectLocale } from "@/lib/i18n";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
}

export const metadata: Metadata = {
  title: {
    default: "Hearthstone Battlegrounds Leaderboard — Live MMR Rankings",
    template: "%s | HS BG Leaderboard",
  },
  description: "Track top Hearthstone Battlegrounds players across EU, US, AP, and CN regions. Live MMR rankings, player stats, historical trends, and Twitch stream status.",
  keywords: ["Hearthstone", "Battlegrounds", "Leaderboard", "MMR", "Ranking", "Blizzard", "BG", "Top Players", "Live Stats", "Battlegrounds Leaderboard", "HS BG"],
  authors: [{ name: "HS BG Leaderboard" }],
  category: "games",
  classification: "Video Game Leaderboard",
  openGraph: {
    title: "Hearthstone Battlegrounds Leaderboard",
    description: "Live MMR rankings for top Hearthstone Battlegrounds players across all regions.",
    type: "website",
    locale: "en_US",
    siteName: "HS BG Leaderboard",
    url: getBaseUrl() || 'https://your-domain.com',
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "HS BG Leaderboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearthstone Battlegrounds Leaderboard",
    description: "Live MMR rankings for top Hearthstone Battlegrounds players across all regions.",
    images: ["/api/og"],
    creator: "@HSBGLeaderboard",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: getBaseUrl() || 'https://your-domain.com',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = detectLocale(await headers());
  const baseUrl = getBaseUrl() || 'https://your-domain.com';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Hearthstone Battlegrounds Leaderboard',
    description: 'Live MMR rankings and player stats for Hearthstone Battlegrounds',
    url: baseUrl,
    applicationCategory: 'Games',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '100',
    },
    author: {
      '@type': 'Organization',
      name: 'HS BG Leaderboard',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/player/{search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

   return (
     <html lang={locale === 'it' ? 'it' : 'en'} className={`${inter.className} h-full antialiased`}>
        <head>
          <link rel="icon" href="/logo.png" />
          <meta name="google-site-verification" content="UVgbouKh4yyEjxMXG3eCkmR_9K07WoUHPGDHVzWJpQs" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
      <body className="min-h-full flex flex-col">
        <SiteNav />
        {children}
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
