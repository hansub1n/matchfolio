import { findAdapter, type SiteAdapter } from "./sites";

// 사용자가 넣은 주소를 받아오기 전에 확인한다 — 아무 주소나 서버가 대신 받아오면 내부망 주소(클라우드 메타데이터
// 169.254.169.254, localhost 등)를 두드리는 데 쓰일 수 있어서(SSRF), 아는 채용 사이트의 https 공고 주소만 받는다.

export type UrlCheck =
  | { ok: true; adapter: SiteAdapter; postingId: string; canonicalUrl: string }
  | { ok: false; reason: "invalid" | "unsupported" | "not_posting"; adapter: SiteAdapter | null };

export function checkJobUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid", adapter: null };
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    return { ok: false, reason: "invalid", adapter: null };
  }
  const adapter = findAdapter(url.hostname);
  if (!adapter || !adapter.supported) return { ok: false, reason: "unsupported", adapter };
  const postingId = adapter.postingId(url);
  if (!postingId || !/^\d{1,12}$/.test(postingId)) return { ok: false, reason: "not_posting", adapter };
  return { ok: true, adapter, postingId, canonicalUrl: adapter.canonicalUrl(postingId) };
}

// 내부·예약 대역 IP — DNS가 이런 주소를 돌려주면 받아오지 않는다(DNS로 내부망을 가리키게 하는 우회 방지).
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    // IPv4가 섞인 IPv6(::ffff:10.0.0.1)는 뒤쪽 IPv4로 다시 본다.
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      v === "::" ||
      v === "::1" ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("fe8") ||
      v.startsWith("fe9") ||
      v.startsWith("fea") ||
      v.startsWith("feb") ||
      v.startsWith("ff")
    );
  }
  const parts = v.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // 링크 로컬·클라우드 메타데이터
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}
