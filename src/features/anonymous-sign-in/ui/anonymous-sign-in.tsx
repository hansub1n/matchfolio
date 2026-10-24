"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabase } from "@/shared/api/supabase";
import { env } from "@/shared/config/env";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// 개발 모드의 effect 두 번 실행 등으로 계정이 두 개 만들어지지 않게, 이 탭에서 한 번만 시도한다.
let signInStarted = false;

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "before-interactive-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT_SRC, async: true });
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("no turnstile"))));
    script.addEventListener("error", () => reject(new Error("Turnstile 스크립트를 불러오지 못했어요")));
    if (!existing) document.head.appendChild(script);
  });
}

// 처음 온 방문자(세션 쿠키 없음)의 익명 계정을 브라우저에서 만든다. 봇이 계정을 무한히 만들어 계정별 AI 한도를
// 우회하지 못하게, Supabase가 Turnstile 토큰을 확인한 뒤에만 계정을 만든다(Auth의 CAPTCHA 설정).
// 위젯은 평소엔 안 보이고(interaction-only), Cloudflare가 확인이 필요하다고 볼 때만 오른쪽 아래에 나타난다.
// 계정이 생기면 화면을 새로 그려서 서버가 이 계정으로 데이터를 읽게 한다.
export function AnonymousSignIn() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;

    async function signIn(captchaToken?: string) {
      if (signInStarted) return;
      signInStarted = true;
      const { error: signInError } = await getBrowserSupabase().auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined
      );
      if (signInError) {
        console.error("익명 로그인 실패:", signInError.message);
        signInStarted = false;
        setError("시작하지 못했어요. 새로고침해서 다시 시도해주세요");
        return;
      }
      router.refresh();
    }

    // 사이트 키가 없는 환경(로컬에서 아직 안 넣었을 때)은 토큰 없이 만든다 — Supabase CAPTCHA가 꺼져 있으면 통과.
    if (!env.turnstile.siteKey) {
      void signIn();
      return;
    }

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: env.turnstile.siteKey,
          appearance: "interaction-only",
          callback: (token) => {
            setNeedsInteraction(false);
            void signIn(token);
          },
          "before-interactive-callback": () => setNeedsInteraction(true),
          "error-callback": () => setError("사람인지 확인하지 못했어요. 새로고침해서 다시 시도해주세요"),
          "expired-callback": () => {
            if (widgetId) turnstile.reset(widgetId);
          },
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("사람인지 확인하는 도구를 불러오지 못했어요. 새로고침해서 다시 시도해주세요");
      });

    // 로그인이 끝나 이 컴포넌트가 사라질 때 위젯도 지운다 — 안 지우면 Turnstile이 없어진 위젯을 찾다 경고를 낸다.
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [router]);

  return (
    <div
      className={
        needsInteraction || error
          ? "fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-xl bg-popover p-3 text-xs shadow-[0_8px_16px_rgb(0_0_0_/_0.08),0_24px_48px_rgb(0_0_0_/_0.16)] ring-1 ring-black/[0.06]"
          : "fixed right-4 bottom-4 z-50"
      }
    >
      {needsInteraction && !error && <p className="text-muted-foreground">시작하기 전에 한 번만 확인할게요</p>}
      {error && <p className="text-destructive">{error}</p>}
      <div ref={containerRef} />
    </div>
  );
}
