"use client";

import { BarChart3, CalendarDays, CircleHelp, FolderGit2, LayoutGrid } from "lucide-react";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { BoardHeader } from "@/widgets/board-header";
import { KanbanBoard } from "@/widgets/kanban-board";
import { Logo } from "@/shared/ui/logo";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// 썸네일은 테마·화면 크기와 상관없이 고정 디자인이라 색을 직접 쓴다(토큰 규칙의 예외).
const LIME = "#D4F55B";

// 캡처할 때 스크롤바 자리·스크롤바, 개발 서버 표시(N 배지)가 끼지 않게.
const NO_SCROLLBAR =
  "html{scrollbar-gutter:auto;overflow:hidden}::-webkit-scrollbar{display:none}nextjs-portal{display:none}";

// 기기 화면 안에 들어가는 앱 — 실제 첫 화면(헤더·이번 주 요약·보드)과 같은 위젯을 예시 데이터로 그린다.
export function BoardFrame({ applications, schedules }: { applications: Application[]; schedules: Schedule[] }) {
  return (
    <main className="flex flex-1 flex-col">
      <style>{NO_SCROLLBAR}</style>
      <Tabs value="board" className="flex-1">
        <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 border-b border-border bg-background px-4 pt-4 pb-3 sm:flex sm:px-6 sm:pt-6 sm:pb-5">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Logo size={22} />
            matchfolio
          </h1>
          <div className="col-span-2 row-start-2 sm:ml-auto">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="board" className="flex-1 sm:flex-none">
                <LayoutGrid data-icon="inline-start" className="max-sm:hidden" />
                보드
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
                <CalendarDays data-icon="inline-start" className="max-sm:hidden" />
                캘린더
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1 sm:flex-none">
                <BarChart3 data-icon="inline-start" className="max-sm:hidden" />
                통계
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 sm:flex-none">
                <FolderGit2 data-icon="inline-start" className="max-sm:hidden" />내 자료
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="col-start-2 row-start-1 flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground max-sm:size-9">
              <CircleHelp className="size-4" />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-4">
          <BoardHeader applications={applications} schedules={schedules} />
          <KanbanBoard applications={applications} schedules={schedules} myProjects={[]} documents={[]} />
        </div>
      </Tabs>
    </main>
  );
}

// 기기 화면 — 원래 폭(width)으로 그린 iframe을 screenWidth에 맞게 줄인다.
// statusBar: 휴대폰 노치가 앱 헤더를 가리지 않게 위에 비워두는 높이(앱 배경색).
function DeviceScreen({
  width,
  screenWidth,
  screenHeight,
  statusBar = 0,
}: {
  width: number;
  screenWidth: number;
  screenHeight: number;
  statusBar?: number;
}) {
  const scale = screenWidth / width;
  const appHeight = screenHeight - statusBar;
  return (
    <div
      style={{
        width: screenWidth,
        height: screenHeight,
        overflow: "hidden",
        position: "relative",
        paddingTop: statusBar,
        background: "#FAFAFA",
      }}
    >
      <iframe
        src="/thumbnail?frame=board"
        title="matchfolio 보드"
        style={{
          width,
          height: appHeight / scale,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// 1600×900 고정 캔버스. 그림자 없이 테두리 색 차이로만 깊이를 낸다. 라임은 문구 한 단어·캡처 카드 테두리·화살표만.
export function ThumbnailCanvas() {
  const laptop = { left: 700, top: 170, width: 800, pad: 14 };
  const laptopScreenW = laptop.width - laptop.pad * 2;
  const laptopScreenH = Math.round((laptopScreenW * 10) / 16);
  const phone = { left: 1330, top: 410, width: 230, height: 460, pad: 8 };

  return (
    <div
      id="thumbnail"
      style={{
        position: "fixed",
        inset: 0,
        width: 1600,
        height: 900,
        overflow: "hidden",
        background: "radial-gradient(circle at 88% -5%, #2A3310 0%, rgba(42,51,16,0) 45%), #121212",
        fontFamily: "Pretendard Variable, Pretendard, sans-serif",
      }}
    >
      <style>{NO_SCROLLBAR}</style>

      {/* 배경 장식 — 로고의 칸반 레인과 같은 세로 막대 4개 */}
      {[820, 1010, 1200, 1390].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x,
            top: -80,
            width: 150,
            height: 1060,
            borderRadius: 40,
            background: "rgba(255,255,255,0.06)",
          }}
        />
      ))}

      {/* 왼쪽 — 로고, 두 줄 문구, 설명 */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 36,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 탭 아이콘 SVG를 그대로 쓴다. */}
        <img src="/icon.svg" width={120} height={120} alt="" />
        <p
          style={{
            margin: 0,
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.3,
            color: "#FAFAFA",
          }}
        >
          공고는 <span style={{ color: LIME }}>캡처만,</span>
          <br />
          정리는 matchfolio가
        </p>
        <p style={{ margin: 0, fontSize: 24, color: "#9A9A9A" }}>스크린샷 한 장으로 시작하는 지원 현황 보드</p>
      </div>

      {/* 노트북 */}
      <div style={{ position: "absolute", left: laptop.left, top: laptop.top }}>
        <div style={{ padding: laptop.pad, borderRadius: 22, background: "#2A2A2A" }}>
          <div style={{ borderRadius: 8, overflow: "hidden" }}>
            <DeviceScreen width={1440} screenWidth={laptopScreenW} screenHeight={laptopScreenH} />
          </div>
        </div>
        <div
          style={{
            marginLeft: -40,
            width: laptop.width + 80,
            height: 18,
            borderRadius: "0 0 14px 14px",
            background: "#3A3A3A",
          }}
        />
      </div>

      {/* 휴대폰 — 노트북 오른쪽 아래에 살짝 겹치게 */}
      <div
        style={{
          position: "absolute",
          left: phone.left,
          top: phone.top,
          width: phone.width,
          height: phone.height,
          padding: phone.pad,
          borderRadius: 38,
          border: "3px solid #3A3A3A",
          background: "#121212",
          transform: "rotate(4deg)",
        }}
      >
        <div style={{ position: "relative", borderRadius: 30, overflow: "hidden" }}>
          <DeviceScreen
            width={390}
            screenWidth={phone.width - phone.pad * 2 - 6}
            screenHeight={phone.height - phone.pad * 2 - 6}
            statusBar={26}
          />
          {/* 노치 */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: "50%",
              width: 64,
              height: 18,
              marginLeft: -32,
              borderRadius: 999,
              background: "#121212",
            }}
          />
        </div>
      </div>

      {/* 공고 캡처 카드 — 노트북 왼쪽 위에 떠 있는 스크린샷 */}
      <div
        style={{
          position: "absolute",
          left: 610,
          top: 96,
          width: 190,
          padding: "16px 18px",
          borderRadius: 16,
          border: `3px solid ${LIME}`,
          background: "#F5F5F5",
          transform: "rotate(-10deg)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: "#8A8A8A" }}>루멘스튜디오</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1C1C" }}>프론트엔드 개발자</span>
        {[100, 80, 90].map((w, i) => (
          <span key={i} style={{ height: 6, width: `${w}%`, borderRadius: 3, background: "#DADADA" }} />
        ))}
        <span style={{ fontSize: 11, color: "#8A8A8A" }}>React · TypeScript · ~ 11.05</span>
      </div>

      {/* 캡처 카드 → 보드로 가는 라임 점선 화살표 */}
      <svg
        width={1600}
        height={900}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        aria-hidden
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill={LIME} />
          </marker>
        </defs>
        <path
          d="M 800 150 C 880 130, 930 190, 900 262"
          fill="none"
          stroke={LIME}
          strokeWidth={3}
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd="url(#arrow)"
        />
      </svg>
    </div>
  );
}
