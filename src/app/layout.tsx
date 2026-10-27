import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matchfolio-omega.vercel.app";
const TITLE = "matchfolio — 스크린샷 한 장으로 지원 현황 관리";
const DESCRIPTION = "채용공고 스크린샷 한 장으로 지원 현황을 정리하세요. 회원가입 없이 바로 시작할 수 있어요.";

// 공유 이미지(opengraph-image.tsx)·아이콘(icon.svg, apple-icon.tsx)·manifest.ts는 파일 규칙으로 Next가 알아서 붙인다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · matchfolio" },
  description: DESCRIPTION,
  applicationName: "matchfolio",
  keywords: ["취업", "지원 현황", "칸반보드", "채용공고", "면접 준비"],
  // metadataBase 기준으로 운영 주소가 붙는다.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    locale: "ko_KR",
    siteName: "matchfolio",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// iOS Safari는 16px보다 작은 입력칸에 포커스하면 화면을 확대한다. 입력칸 글자를 16px로 키우면 휴대폰에서 너무 커 보여서,
// 대신 최대 배율을 1로 둬 자동 확대를 막는다(iOS는 손가락으로 벌려 확대하는 건 이 값과 상관없이 허용한다).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // 지금은 라이트만 — 브라우저 상단 색도 배경색 하나.
  themeColor: "#FAFAFA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
