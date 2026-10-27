import { ImageResponse } from "next/og";

import { Logo } from "@/shared/ui/logo";

// 홈 화면에 추가했을 때의 아이콘. iOS가 모서리를 직접 깎아서 꽉 찬 사각형으로 그린다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<Logo size={180} simple={false} rounded={false} />, size);
}
