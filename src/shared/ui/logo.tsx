// 로고 — 검정 둥근 사각형 위에 칸반 레인 3개, 가운데 레인 위쪽에 라임 카드(관심 공고가 막 들어온 모습),
// 양옆 레인엔 회색 카드. 16px 이하에선 카드가 뭉개져서 레인 3개만 남기고 가운데 레인을 통째로 라임으로 칠한다.
// 탭 아이콘(app/icon.svg)·favicon.ico·홈 화면 아이콘과 같은 모양. 공유 이미지(next/og)에서도 쓰려고
// style·className 없이 SVG 속성만 쓰고, SVG 안에 Fragment를 두지 않는다(next/og가 못 읽음).

export const LOGO_COLORS = {
  background: "#1C1C1C",
  lane: "#3A3A3A",
  // 단순 버전 레인 — 카드 없이 막대만이라 한 단계 밝게.
  laneSimple: "#4A4A4A",
  card: "#6B6B6B",
  lime: "#D4F55B",
} as const;

const LANES_X = [18, 40, 62];
// [x, y, 높이, 라임 여부]
const CARDS: [x: number, y: number, height: number, isLime: boolean][] = [
  [40, 28, 16, true],
  [18, 28, 10, false],
  [62, 28, 10, false],
  [62, 42, 10, false],
];

export function Logo({
  size = 22,
  simple = size <= 16,
  rounded = true,
}: {
  size?: number;
  // 막대 3개만(작은 크기용). 기본은 16px 이하에서 자동.
  simple?: boolean;
  // apple-icon처럼 기기가 모서리를 깎는 곳은 꽉 찬 사각형으로.
  rounded?: boolean;
}) {
  const { background, lane, laneSimple, card, lime } = LOGO_COLORS;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="96" height="96" rx={rounded ? 22 : 0} fill={background} />
      {simple
        ? LANES_X.map((x, i) => (
            <rect key={x} x={x} y={20} width={16} height={56} rx={6} fill={i === 1 ? lime : laneSimple} />
          ))
        : [
            ...LANES_X.map((x) => <rect key={x} x={x} y={22} width={16} height={52} rx={5} fill={lane} />),
            ...CARDS.map(([x, y, height, isLime]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width={16} height={height} rx={height > 10 ? 4 : 3} fill={isLime ? lime : card} />
            )),
          ]}
    </svg>
  );
}
