import { normalizeCompanyName } from "./company-name";

export interface CompanySearchLink {
  label: string;
  url: string;
}

// 분석 결과와 상관없이 항상 보여주는 "더 찾아보기" 링크 — 회사명만으로 만들 수
// 있는 외부 검색 링크라서 AI 분석 성공 여부와 무관하게 항상 쓸 수 있다.
export function buildCompanySearchLinks(company: string): CompanySearchLink[] {
  const query = encodeURIComponent(normalizeCompanyName(company) || company);
  return [
    { label: "네이버 뉴스", url: `https://search.naver.com/search.naver?where=news&query=${query}` },
    { label: "잡플래닛", url: `https://www.jobplanet.co.kr/search?query=${query}` },
    {
      label: "사람인 기업정보",
      url: `https://www.saramin.co.kr/zf_user/search/company?searchword=${query}`,
    },
    { label: "원티드", url: `https://www.wanted.co.kr/search?query=${query}` },
  ];
}
