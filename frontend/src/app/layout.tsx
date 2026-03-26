import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { AuthProvider } from "@/components/auth-provider";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://gongsittak.com";
const SITE_NAME = "공시딱";
const SITE_TITLE = "공시딱 | 알아서 공시 딱";
const SITE_DESC =
  "DART 공시를 AI가 자동으로 분석하고 호재/악재를 판별해드립니다. 관심종목 추적, 오늘의 브리핑까지.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "공시 분석",
    "DART",
    "AI 공시",
    "주식 공시",
    "호재 악재",
    "한국 주식",
    "공시 알림",
    "공시딱",
    "관심종목",
    "오늘의 브리핑",
    "공시 필터링",
    "투자 정보",
    "금융 AI",
    "전자공시",
    "실시간 공시",
    "공시 검색",
    "주가",
    "종목 분석",
    "투자 도구",
    "기업 공시",
    "상장사 공시",
    "증권 정보",
    "재무제표",
    "사업보고서",
    "공시 자동화",
    "AI 투자",
    "스마트 투자",
    "공시 요약",
    "중요 공시",
    "공시 트렌드",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: SITE_NAME,
    url: SITE_URL,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: "Zl29et0mZnPrc2Zjwn8RJ3vjPez_FzrfQmrle9GuAbM",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "128x128" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "128x128", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "naver-site-verification": "fd9a533d851bb35c179ef005048d3c350f6bb64b",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "공시딱",
              alternateName: "GONGSITTAK",
              url: "https://gongsittak.com",
              description:
                "DART 공시를 AI가 자동으로 분석하고 호재/악재를 판별해드립니다.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
              },
              inLanguage: "ko",
            }),
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZY0B7D53G0"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-ZY0B7D53G0');`}
        </Script>
        <Script
          id="theme-init"
          strategy="beforeInteractive">{`(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'){d.classList.add('dark')}}catch(e){}})()`}</Script>
        <SwRegister />
        <AuthProvider>
          <Nav />
          <Toaster position="bottom-right" />
          <main className="flex-1 px-4 py-6 pb-20 sm:px-6 sm:pb-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
          <footer className="hidden sm:block border-t border-border py-4 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              공시딱 &middot; AI 공시 분석 &middot; DART 기반
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
