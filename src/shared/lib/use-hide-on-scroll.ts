"use client";

import { useEffect, useRef, useState } from "react";

// 아래로 스크롤하면 숨고, 조금이라도 위로 올리면 다시 나타나는 헤더용.
// - 맨 위 근처(헤더 높이만큼)에선 항상 보인다.
// - 손떨림 같은 작은 움직임(threshold px 미만)엔 반응하지 않는다.
// - 모달이 열려 스크롤이 잠긴 동안(body[data-scroll-locked])엔 상태를 바꾸지 않는다.
export function useHideOnScroll({ topOffset = 80, threshold = 6 }: { topOffset?: number; threshold?: number } = {}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;
    function update() {
      frame = 0;
      if (document.body.hasAttribute("data-scroll-locked")) return;
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y <= topOffset) setHidden(false);
      else if (delta > threshold) setHidden(true);
      else if (delta < -threshold) setHidden(false);
      else return;
      lastY.current = y;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [topOffset, threshold]);

  return hidden;
}
