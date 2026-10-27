import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때의 이름·색·아이콘. 192/512 아이콘은 로고(shared/ui/logo.tsx)를 PNG로 뽑아 public/에 둔 것.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "matchfolio",
    short_name: "matchfolio",
    description: "채용공고 스크린샷 한 장으로 지원 현황을 정리하세요. 회원가입 없이 바로 시작할 수 있어요.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
