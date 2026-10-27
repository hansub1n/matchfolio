import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { LOGO_COLORS, Logo } from "@/shared/ui/logo";

// 링크를 공유했을 때 보이는 이미지. 왼쪽에 로고·한 줄 소개, 오른쪽에 실제 보드를 줄인 미니 보드.
// next/og는 WOFF2를 못 읽어서 Pretendard OTF를 직접 넘긴다(빌드 때 한 번 그려 캐시됨).
export const alt = "matchfolio — 채용공고 스크린샷 한 장으로 지원 현황 관리";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");

const INK = "#1C1C1C";
const MUTED = "#737373";
const BORDER = "#E5E5E5";

type MiniCard = { company: string; role: string; badge?: string };
const LANES: { title: string; cards: MiniCard[] }[] = [
  {
    title: "관심",
    cards: [
      { company: "오로라랩", role: "프론트엔드 개발자", badge: "D-3" },
      { company: "모래알소프트", role: "웹 프론트엔드" },
    ],
  },
  { title: "서류", cards: [{ company: "파도컴퍼니", role: "React 개발자" }, { company: "구름다리", role: "UI 엔지니어" }] },
  { title: "면접", cards: [{ company: "달팽이랩스", role: "프론트엔드 (신입)" }] },
];

export default async function OpengraphImage() {
  const [regular, semibold] = await Promise.all([
    readFile(join(FONT_DIR, "Pretendard-Regular.otf")),
    readFile(join(FONT_DIR, "Pretendard-SemiBold.otf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FAFAFA",
          fontFamily: "Pretendard",
          color: INK,
          padding: "72px 64px 72px 80px",
        }}
      >
        {/* 왼쪽: 로고 + 제목 + 한 줄 */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Logo size={64} />
            <span style={{ fontSize: 28, fontWeight: 600 }}>matchfolio</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 52, fontWeight: 600, lineHeight: 1.3 }}>
            <div style={{ display: "flex" }}>
              <span style={{ marginRight: 14 }}>채용공고</span>
              <span style={{ backgroundImage: `linear-gradient(transparent 55%, ${LOGO_COLORS.lime} 55%)` }}>
                스크린샷 한 장
              </span>
              <span>으로</span>
            </div>
            <div style={{ display: "flex" }}>지원 현황 관리</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
            회원가입 없이 바로 시작 · matchfolio-omega.vercel.app
          </div>
        </div>

        {/* 오른쪽: 미니 보드 */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginLeft: "auto",
            alignSelf: "center",
            width: 440,
            padding: 16,
            borderRadius: 24,
            background: "#F0F0F0",
          }}
        >
          {LANES.map((lane) => (
            <div key={lane.title} style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", gap: 6, fontSize: 15, color: MUTED, padding: "2px 4px" }}>
                <span>{lane.title}</span>
                <span>{lane.cards.length}</span>
              </div>
              {lane.cards.map((card) => (
                <div
                  key={card.company}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 12,
                    borderRadius: 12,
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{card.company}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{card.role}</span>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      borderTop: `1px solid ${BORDER}`,
                      paddingTop: 6,
                      height: 30,
                    }}
                  >
                    {card.badge && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: LOGO_COLORS.lime,
                        }}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
        { name: "Pretendard", data: semibold, weight: 600, style: "normal" },
      ],
    }
  );
}
