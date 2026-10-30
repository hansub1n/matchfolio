// 링크로 넣기 — 사이트별 어댑터. 어디서 공고 id를 꺼내고 어떤 주소를 받아오는지만 사이트마다 다르다.
// 조사(2026-10-30): 원티드·리멤버·점핏은 공고 페이지 HTML에 본문 글자가 그대로 있다(원티드·리멤버는 JSON-LD도).
// 사람인·잡코리아는 본문이 별도 프레임 주소에 있고 공고에 따라 통이미지라, 어댑터 자리만 두고 아직 열지 않는다.
// 로켓펀치는 Cloudflare 봇 차단(403), 프로그래머스 커리어는 도메인이 없어 받아올 수 없다.

// 링크로 넣기는 지금 꺼져 있다(2026-10-30). 원티드·리멤버·점핏 모두 운영 서버에서 읽히는 것까지 확인했지만, 세 곳
// 약관 모두 허락 없는 자동 수집을 금지하고 있어서 껐다. 같은 편의는 스크린샷 붙여넣기로 이미 된다.
// 사이트와 제휴하거나 공식 API가 생기면 이 값을 true로 바꾸면 입력칸과 서버 라우트가 함께 다시 켜진다.
// 동작 모습: docs/link-demo.gif
export const LINK_READING_ENABLED = false;

export type SiteId = "wanted" | "remember" | "jumpit" | "saramin" | "jobkorea" | "rocketpunch" | "programmers";

export interface SiteAdapter {
  id: SiteId;
  label: string;
  hosts: string[];
  // false면 "아직 지원하지 않는 사이트예요" — 주소는 알아보지만 읽지 않는다.
  supported: boolean;
  // 공고 상세 주소에서 id를 꺼낸다. 목록·검색 페이지처럼 공고 하나가 아니면 null.
  postingId: (url: URL) => string | null;
  // 같은 공고를 한 주소로 — 중복 확인과 저장에 쓴다(추적용 쿼리 등 제거).
  canonicalUrl: (id: string) => string;
  // 본문을 받아올 주소. 사람인·잡코리아처럼 본문이 프레임에 있으면 그 주소를 더한다(지원할 때 채울 자리).
  fetchUrls: (id: string) => string[];
}

const match = (url: URL, pattern: RegExp) => url.pathname.match(pattern)?.[1] ?? null;

export const SITE_ADAPTERS: SiteAdapter[] = [
  {
    id: "wanted",
    label: "원티드",
    hosts: ["www.wanted.co.kr", "wanted.co.kr"],
    supported: true,
    postingId: (url) => match(url, /^\/wd\/(\d+)\/?$/),
    canonicalUrl: (id) => `https://www.wanted.co.kr/wd/${id}`,
    fetchUrls: (id) => [`https://www.wanted.co.kr/wd/${id}`],
  },
  {
    id: "remember",
    label: "리멤버",
    hosts: ["career.rememberapp.co.kr"],
    supported: true,
    postingId: (url) => match(url, /^\/job\/posting\/(\d+)\/?$/),
    canonicalUrl: (id) => `https://career.rememberapp.co.kr/job/posting/${id}`,
    fetchUrls: (id) => [`https://career.rememberapp.co.kr/job/posting/${id}`],
  },
  {
    id: "jumpit",
    label: "점핏",
    hosts: ["jumpit.saramin.co.kr"],
    supported: true,
    postingId: (url) => match(url, /^\/position\/(\d+)\/?$/),
    canonicalUrl: (id) => `https://jumpit.saramin.co.kr/position/${id}`,
    fetchUrls: (id) => [`https://jumpit.saramin.co.kr/position/${id}`],
  },
  {
    id: "saramin",
    label: "사람인",
    hosts: ["www.saramin.co.kr", "saramin.co.kr", "m.saramin.co.kr"],
    supported: false,
    postingId: (url) => url.searchParams.get("rec_idx"),
    canonicalUrl: (id) => `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`,
    // 본문은 view-detail 프레임에 있다(글자 또는 통이미지).
    fetchUrls: (id) => [
      `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`,
      `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${id}`,
    ],
  },
  {
    id: "jobkorea",
    label: "잡코리아",
    hosts: ["www.jobkorea.co.kr", "jobkorea.co.kr", "m.jobkorea.co.kr"],
    supported: false,
    postingId: (url) => match(url, /^\/Recruit\/GI_Read\/(\d+)/i),
    canonicalUrl: (id) => `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`,
    // 본문은 GI_Read_Comt_Ifrm 프레임에 있다(글자 또는 세로로 긴 포스터).
    fetchUrls: (id) => [
      `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`,
      `https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=${id}`,
    ],
  },
  {
    id: "rocketpunch",
    label: "로켓펀치",
    hosts: ["www.rocketpunch.com", "rocketpunch.com"],
    supported: false,
    postingId: (url) => match(url, /^\/jobs\/(\d+)/),
    canonicalUrl: (id) => `https://www.rocketpunch.com/jobs/${id}`,
    fetchUrls: () => [],
  },
  {
    id: "programmers",
    label: "프로그래머스",
    hosts: ["career.programmers.co.kr"],
    supported: false,
    postingId: (url) => match(url, /^\/job_positions\/(\d+)/),
    canonicalUrl: (id) => `https://career.programmers.co.kr/job_positions/${id}`,
    fetchUrls: () => [],
  },
];

export const SUPPORTED_SITE_LABELS = SITE_ADAPTERS.filter((a) => a.supported).map((a) => a.label);

export function findAdapter(host: string): SiteAdapter | null {
  const lower = host.toLowerCase();
  return SITE_ADAPTERS.find((adapter) => adapter.hosts.includes(lower)) ?? null;
}

// 받아오는 중 다른 주소로 넘어갈 때 — 같은 사이트(지원하는 사이트) 주소로만 따라간다.
export function isAllowedFetchHost(host: string): boolean {
  return findAdapter(host)?.supported === true;
}
