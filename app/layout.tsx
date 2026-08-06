import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "央国企股息雷达",
    description: "A股央国企龙头的股息、月线趋势过滤与周线布林带执行监控面板。",
    openGraph: {
      title: "央国企股息雷达",
      description: "月线定风险 · 周线做执行",
      images: [{ url: "/og.png", width: 1728, height: 972, alt: "央国企股息雷达：月线定风险，周线做执行" }],
    },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
