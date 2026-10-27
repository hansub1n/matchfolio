import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { todayKST } from "@/shared/lib/kst-date";

import { buildThumbnailData } from "./fixtures";
import { BoardFrame, ThumbnailCanvas } from "./thumbnail-view";

// 포트폴리오 썸네일(1600×900)을 찍는 숨김 페이지 — 개발 서버에서만 열린다(`pnpm thumbnail`로 캡처).
// Supabase를 부르지 않고 예시 데이터만 쓴다.
// 기기 화면 안은 iframe(?frame=board)으로 그린다. 반응형 기준이 창 폭이라, 같은 페이지 안에서 390px로 그려도
// 휴대폰 레이아웃이 나오지 않아서 — iframe은 자기 폭을 창 폭으로 보고 실제 기기와 똑같이 그린다.
export const metadata: Metadata = {
  title: "썸네일",
  robots: { index: false },
};

export default async function ThumbnailPage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { frame } = await searchParams;
  if (frame === "board") {
    const { applications, schedules } = buildThumbnailData(todayKST());
    return <BoardFrame applications={applications} schedules={schedules} />;
  }
  return <ThumbnailCanvas />;
}
