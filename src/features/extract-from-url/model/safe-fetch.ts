import { isPrivateAddress } from "./url-guard";

// 공고 페이지 받아오기 — 지원 사이트 주소만, 다른 주소로 넘어가는 것도 지원 사이트 안에서만(최대 3번),
// 전체 8초, 응답 2MB까지. DNS가 내부·예약 대역 IP를 돌려주면 받아오지 않는다.
// fetch와 DNS 조회는 주입받는다(테스트에서 가짜로).

export const FETCH_TIMEOUT_MS = 8000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
// 어디서 온 요청인지 밝힌다 — 사용자가 링크를 넣을 때 그 주소 하나만 받아오고 저장하지 않는다.
export const FETCH_USER_AGENT =
  "Mozilla/5.0 (compatible; matchfolio/1.0; +https://matchfolio-omega.vercel.app/privacy)";

export type FetchFailReason = "blocked" | "not_found" | "timeout" | "too_large" | "redirect_blocked" | "private_ip" | "network";

export class FetchFailure extends Error {
  constructor(
    readonly reason: FetchFailReason,
    message: string = reason
  ) {
    super(message);
    this.name = "FetchFailure";
  }
}

export interface SafeFetchDeps {
  fetch: typeof fetch;
  // 호스트 이름의 IP 전부.
  lookup: (host: string) => Promise<string[]>;
  isAllowedHost: (host: string) => boolean;
}

async function assertPublicHost(url: URL, deps: SafeFetchDeps) {
  if (url.protocol !== "https:" || !deps.isAllowedHost(url.hostname)) throw new FetchFailure("redirect_blocked");
  let addresses: string[];
  try {
    addresses = await deps.lookup(url.hostname);
  } catch {
    throw new FetchFailure("network", "주소를 찾을 수 없음");
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new FetchFailure("private_ip");
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new FetchFailure("too_large");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new FetchFailure("too_large");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export async function safeFetchHtml(startUrl: string, deps: SafeFetchDeps): Promise<{ html: string; finalUrl: string }> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let url = new URL(startUrl);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url, deps);
      const response = await deps.fetch(url, {
        redirect: "manual",
        signal,
        headers: { "user-agent": FETCH_USER_AGENT, accept: "text/html", "accept-language": "ko-KR,ko;q=0.9" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new FetchFailure("network");
        url = new URL(location, url);
        continue;
      }
      if (response.status === 404 || response.status === 410) throw new FetchFailure("not_found");
      if (response.status === 401 || response.status === 403 || response.status === 429) throw new FetchFailure("blocked");
      if (!response.ok) throw new FetchFailure("network", `HTTP ${response.status}`);
      const html = await readLimited(response);
      // 봇 확인 화면(Cloudflare 등)은 200으로 올 때도 있다.
      if (/Just a moment|cf-chl|challenge-platform/i.test(html.slice(0, 20000))) throw new FetchFailure("blocked");
      return { html, finalUrl: url.href };
    }
    throw new FetchFailure("redirect_blocked", "너무 많이 넘어감");
  } catch (error) {
    if (error instanceof FetchFailure) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new FetchFailure("timeout");
    }
    throw new FetchFailure("network", error instanceof Error ? error.message : String(error));
  }
}
