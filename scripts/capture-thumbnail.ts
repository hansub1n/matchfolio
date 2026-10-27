// 포트폴리오 썸네일 캡처 — `pnpm dev`를 켜둔 상태에서 `pnpm thumbnail`.
// 개발 서버의 숨김 페이지(/thumbnail, 1600×900)를 2배 해상도로 찍어 docs/thumbnail.png에 저장한다.
// 브라우저를 따로 내려받지 않게 설치된 Chrome을 쓴다(channel: "chrome").
import { chromium } from "playwright";

const URL = process.env.THUMBNAIL_URL ?? "http://localhost:3000/thumbnail";
const OUT = "docs/thumbnail.png";

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle" });
  // 캔버스와 기기 화면(iframe) 모두 폰트가 다 불러와질 때까지 기다린다.
  for (const frame of page.frames()) {
    await frame.waitForLoadState("networkidle");
    await frame.evaluate(() => document.fonts.ready.then(() => undefined));
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1600, height: 900 } });
  await browser.close();
  console.log(`저장: ${OUT}`);
}

main().catch((err) => {
  console.error("썸네일 캡처 실패 — pnpm dev가 켜져 있는지 확인해주세요.", err);
  process.exit(1);
});
