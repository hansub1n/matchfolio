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

export const metadata: Metadata = {
  title: "matchfolio",
  description: "취업 지원 현황을 칸반보드로 관리하는 개인 포트폴리오 프로젝트",
};

// iOS Safari는 16px보다 작은 입력칸에 포커스하면 화면을 확대한다. 입력칸 글자를 16px로 키우면 휴대폰에서 너무 커 보여서,
// 대신 최대 배율을 1로 둬 자동 확대를 막는다(iOS는 손가락으로 벌려 확대하는 건 이 값과 상관없이 허용한다).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
