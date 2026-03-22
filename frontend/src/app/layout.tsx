import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://al-zal-ttak.vercel.app";
const SITE_NAME = "알잘딱";
const SITE_TITLE = "알잘딱 | 공시, 알아서 잘 딱 깔끔하게";
const SITE_DESC = "DART 공시를 AI가 자동으로 분석하고 호재/악재를 판별해드립니다. 관심종목 추적, 텔레그램 알림까지.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "공시 분석", "DART", "AI 공시", "주식 공시", "호재 악재",
    "한국 주식", "공시 알림", "알잘딱", "관심종목", "텔레그램 알림",
    "공시 필터링", "투자 정보", "금융 AI",
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "알잘딱",
              alternateName: "ALZALTTAK",
              url: "https://al-zal-ttak.vercel.app",
              description: "DART 공시를 AI가 자동으로 분석하고 호재/악재를 판별해드립니다.",
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
          strategy="beforeInteractive"
        >{`(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}}catch(e){}})()`}</Script>
        <AuthProvider>
          <Nav />
          <Toaster position="bottom-right" />
          <main className="flex-1 px-4 py-6 pb-20 sm:px-6 sm:pb-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
          <footer className="hidden sm:block border-t border-border py-4 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              알잘딱 &middot; AI 공시 분석 &middot; DART 기반
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
