import { describe, expect, it } from "vitest";

import { checkJobUrl, isPrivateAddress } from "./url-guard";

// 서버가 사용자 대신 주소를 받아오는 기능이라, 아는 사이트의 https 공고 주소가 아니면 받지 않아야 한다(내부망 접근 방지).
describe("checkJobUrl", () => {
  it("지원 사이트 공고 주소는 id를 꺼내고 추적 쿼리를 뗀 주소로 맞춘다", () => {
    const r = checkJobUrl("https://www.wanted.co.kr/wd/395545?utm_source=kakao");
    expect(r).toMatchObject({ ok: true, postingId: "395545", canonicalUrl: "https://www.wanted.co.kr/wd/395545" });
    expect(checkJobUrl("https://career.rememberapp.co.kr/job/posting/349577")).toMatchObject({ ok: true });
    expect(checkJobUrl("https://jumpit.saramin.co.kr/position/55435121")).toMatchObject({ ok: true });
  });

  it("https가 아니거나 계정·다른 포트가 붙은 주소는 받지 않는다", () => {
    expect(checkJobUrl("http://www.wanted.co.kr/wd/1")).toMatchObject({ ok: false, reason: "invalid" });
    expect(checkJobUrl("https://user:pw@www.wanted.co.kr/wd/1")).toMatchObject({ ok: false, reason: "invalid" });
    expect(checkJobUrl("https://www.wanted.co.kr:8443/wd/1")).toMatchObject({ ok: false, reason: "invalid" });
    expect(checkJobUrl("주소 아님")).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("어댑터만 있는 사이트(사람인·잡코리아)와 모르는 사이트는 지원하지 않는다고 알린다", () => {
    expect(checkJobUrl("https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1")).toMatchObject({
      ok: false,
      reason: "unsupported",
      adapter: { id: "saramin" },
    });
    expect(checkJobUrl("https://www.jobkorea.co.kr/Recruit/GI_Read/1")).toMatchObject({ reason: "unsupported" });
    expect(checkJobUrl("https://169.254.169.254/latest/meta-data")).toMatchObject({ reason: "unsupported", adapter: null });
    expect(checkJobUrl("https://wanted.co.kr.evil.com/wd/1")).toMatchObject({ reason: "unsupported" });
  });

  it("목록·검색 페이지처럼 공고 하나가 아니면 알려준다", () => {
    expect(checkJobUrl("https://www.wanted.co.kr/wdlist/518")).toMatchObject({ ok: false, reason: "not_posting" });
  });
});

describe("isPrivateAddress", () => {
  it("내부·예약 대역은 막는다", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.0.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("공용 주소는 통과시킨다", () => {
    for (const ip of ["3.168.178.46", "104.18.2.1", "2606:4700::6810:1"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
