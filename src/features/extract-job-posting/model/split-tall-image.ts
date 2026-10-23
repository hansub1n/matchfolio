export interface TileRect {
  top: number;
  height: number;
}

// 전체 페이지 캡처처럼 세로로 아주 긴 이미지는 모델 입력 크기로 줄어들면서 본문
// 글자가 읽을 수 없을 만큼 작아진다(1280×4192 캡처에서 내용을 지어낸 원인).
// 세로가 가로의 2배를 넘으면 가로:세로 1:1.2 조각으로 나눠 보낸다. 조각 경계에 걸친
// 줄이 잘리지 않게 위아래로 겹치게 자른다.
const SPLIT_RATIO = 2;
const TILE_RATIO = 1.2;
const OVERLAP_PX = 100;
const MAX_TILES = 6;

export function computeTileRects(width: number, height: number): TileRect[] {
  if (width <= 0 || height <= width * SPLIT_RATIO) return [{ top: 0, height }];

  let tileHeight = Math.round(width * TILE_RATIO);
  const count = Math.ceil((height - OVERLAP_PX) / (tileHeight - OVERLAP_PX));
  // 너무 길면 조각 수를 늘리지 않고 조각을 키운다 — 끝부분이 잘려 나가지 않게.
  if (count > MAX_TILES) {
    tileHeight = Math.ceil((height + OVERLAP_PX * (MAX_TILES - 1)) / MAX_TILES);
  }

  const rects: TileRect[] = [];
  for (let top = 0; ; top += tileHeight - OVERLAP_PX) {
    const tileBottom = Math.min(top + tileHeight, height);
    rects.push({ top, height: tileBottom - top });
    if (tileBottom >= height) break;
  }
  return rects;
}
