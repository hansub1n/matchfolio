import { describe, expect, it } from "vitest";

import { FetchFailure, MAX_RESPONSE_BYTES, safeFetchHtml, type SafeFetchDeps } from "./safe-fetch";

// 다른 사이트로 넘기는 응답(리다이렉트)으로 내부망이나 모르는 사이트를 두드리게 만드는 걸 막는지,
// 사이트가 막았을 때 이유를 구분하는지 확인한다.
const ALLOWED = new Set(["www.wanted.co.kr"]);

function deps(responses: Record<string, Response | (() => Response)>, ips: Record<string, string[]> = {}): SafeFetchDeps {
  return {
    fetch: (async (input: URL | string) => {
      const r = responses[String(input)];
      if (!r) throw new Error(`예상 못 한 요청 ${input}`);
      return typeof r === "function" ? r() : r;
    }) as typeof fetch,
    lookup: async (host) => ips[host] ?? ["3.168.178.46"],
    isAllowedHost: (host) => ALLOWED.has(host),
  };
}

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });
const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html" } });

async function reason(promise: Promise<unknown>) {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return error instanceof FetchFailure ? error.reason : "other";
  }
}

describe("safeFetchHtml", () => {
  it("같은 사이트 안의 리다이렉트는 따라간다", async () => {
    const result = await safeFetchHtml(
      "https://www.wanted.co.kr/wd/1",
      deps({ "https://www.wanted.co.kr/wd/1": redirect("/wd/1/"), "https://www.wanted.co.kr/wd/1/": html("<p>공고</p>") })
    );
    expect(result).toEqual({ html: "<p>공고</p>", finalUrl: "https://www.wanted.co.kr/wd/1/" });
  });

  it("다른 사이트나 http로 넘기면 따라가지 않는다", async () => {
    const url = "https://www.wanted.co.kr/wd/1";
    expect(await reason(safeFetchHtml(url, deps({ [url]: redirect("https://evil.example/") })))).toBe("redirect_blocked");
    expect(await reason(safeFetchHtml(url, deps({ [url]: redirect("http://www.wanted.co.kr/wd/1") })))).toBe("redirect_blocked");
  });

  it("DNS가 내부 IP를 돌려주면 받아오지 않는다", async () => {
    expect(await reason(safeFetchHtml("https://www.wanted.co.kr/wd/1", deps({}, { "www.wanted.co.kr": ["10.0.0.5"] })))).toBe("private_ip");
  });

  it("차단·없음·봇 확인 화면·너무 큰 응답을 구분한다", async () => {
    const url = "https://www.wanted.co.kr/wd/1";
    expect(await reason(safeFetchHtml(url, deps({ [url]: html("", 403) })))).toBe("blocked");
    expect(await reason(safeFetchHtml(url, deps({ [url]: html("", 404) })))).toBe("not_found");
    expect(await reason(safeFetchHtml(url, deps({ [url]: html("<title>Just a moment...</title>") })))).toBe("blocked");
    expect(await reason(safeFetchHtml(url, deps({ [url]: () => html("가".repeat(MAX_RESPONSE_BYTES)) })))).toBe("too_large");
  });
});
