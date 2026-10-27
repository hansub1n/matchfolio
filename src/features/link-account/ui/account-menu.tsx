"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { getBrowserSupabase, isSessionOnlyLogin, setSessionOnlyLogin } from "@/shared/api/supabase";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { openFeedback } from "@/shared/lib/feedback-store";
import { showToast } from "@/shared/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { classifyAuthError } from "../model/auth-error";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

interface GithubAccount {
  login: string;
  avatarUrl: string | null;
}

// 연결된 GitHub가 없으면(익명 계정) null.
function toGithubAccount(user: User | null): GithubAccount | null {
  const github = user?.identities?.find((i) => i.provider === "github");
  if (!github) return null;
  return {
    login: String(github.identity_data?.user_name ?? github.identity_data?.preferred_username ?? "GitHub"),
    avatarUrl: (github.identity_data?.avatar_url as string | undefined) ?? null,
  };
}

const CALLBACK_PATH = "/auth/callback";
// 로그아웃 뒤 공용 컴퓨터 안내는 이 브라우저에서 한 번만.
const SIGNED_OUT_NOTICE_KEY = "matchfolio:signed-out-notice-seen";

// 헤더 오른쪽의 계정 자리. 익명이면 "GitHub 연결"(지금 기록에 GitHub를 붙여 다른 기기·브라우저에서도 같은
// 기록을 보게), 연결돼 있으면 프로필 사진 + 메뉴(아이디·로그아웃). 확인 전엔 같은 크기 빈 자리를 둬서
// 헤더가 밀리지 않게 한다.
export function AccountMenu({
  localCounts,
  onRequestDeleteAccount,
}: {
  // 지금 이 브라우저(익명 계정)에 넣어둔 것 — 저장된 보드로 바꾸면 옮겨지지 않아서, 있을 때만 묻는다.
  localCounts: { applications: number; materials: number };
  // "계정과 모든 기록 지우기" — 확인 창은 계정 지우기 feature 것이라 바깥(app)에서 연다.
  onRequestDeleteAccount: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<GithubAccount | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // 로그인·로그아웃은 몇 초 걸리는데(GitHub로 이동 / 로그아웃 뒤 새 익명 계정 만들기) 그동안 아무 표시가 없으면
  // 안 눌린 줄 안다 — 화면을 덮고 무슨 중인지 띄운다.
  const [pending, setPending] = useState<"github" | "signout" | null>(null);
  // 로그인 상태 구독(onAuthStateChange) 안에서 지금 무슨 중인지 읽으려고 ref에도 둔다.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  // 로그아웃이 끝나면 공용 컴퓨터 안내를 한 번 띄운다.
  const [signedOutNotice, setSignedOutNotice] = useState(false);
  // "이 기기에서 로그인 유지" — 기본은 꺼짐(브라우저를 닫으면 로그아웃, shared/api/session-persistence).
  const [remember, setRemember] = useState(false);
  // 오류는 두 경로로 온다: 우리 /auth/callback을 거치면 ?auth_error=, 연결 단계에서 바로 실패하면 Supabase가 첫 화면
  // 주소에 ?error_code=를 붙여 보낸다(이미 다른 보드에 연결된 GitHub가 이쪽).
  const errorKind = classifyAuthError(searchParams.get("auth_error") ?? searchParams.get("error_code"));
  const hasLocalData = localCounts.applications + localCounts.materials > 0;
  // 이 GitHub에 이미 보드가 있는데 이 브라우저엔 넣은 게 없으면 물어볼 이유가 없다 — 바로 그 보드로 로그인.
  const autoSwitch = errorKind === "already_linked" && !hasLocalData;

  // 처음 한 번 읽고, 로그인 상태가 바뀔 때마다(로그아웃 → 새 익명 계정, GitHub 로그인 등) 다시 그린다.
  // 처음에만 읽으면 로그아웃해도 새로고침 전까지 프로필 사진이 남았다.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setAccount(toGithubAccount(data.user));
      setRemember(!isSessionOnlyLogin());
      // GitHub로 갔다가 취소하고 돌아오면 익명인데 "유지 안 함" 표시만 남는다 — 그대로 두면 브라우저를 닫을 때
      // 익명 보드가 사라지니, 표시를 지우고 세션 쿠키를 다시 오래 가게 써둔다.
      if (data.user?.is_anonymous && isSessionOnlyLogin()) {
        setSessionOnlyLogin(false);
        void supabase.auth.refreshSession();
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setAccount(toGithubAccount(session?.user ?? null));
      // 로그아웃 뒤 새 익명 계정이 만들어지면 로그아웃이 끝난 것.
      if (event === "SIGNED_IN" && session?.user?.is_anonymous && pendingRef.current === "signout") {
        setPending(null);
        if (!readNoticeSeen()) {
          setSignedOutNotice(true);
          markNoticeSeen();
        }
      }
    });
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const redirectTo = () => `${window.location.origin}${CALLBACK_PATH}`;

  // 계정 선택 화면을 매번 띄운다 — 안 그러면 브라우저에 GitHub 로그인이 남아 있을 때(공용 컴퓨터 등) 다음 사람이
  // "GitHub 연결"을 누르는 순간 묻지도 않고 앞사람 보드로 들어갔다.
  const oauthOptions = () => ({ redirectTo: redirectTo(), queryParams: { prompt: "select_account" } });

  async function handleLink() {
    setBusy(true);
    setPending("github");
    setSessionOnlyLogin(true);
    // 지금 익명 계정에 GitHub를 붙인다 — 같은 계정이라 넣어둔 기록이 그대로 이어진다.
    const { error } = await getBrowserSupabase().auth.linkIdentity({
      provider: "github",
      options: oauthOptions(),
    });
    if (error) {
      setPending(null);
      setSessionOnlyLogin(false);
      console.error("GitHub 연결 시작 실패:", error.message);
      // 콘솔에만 남기면 버튼이 안 눌린 것처럼 보여서 화면에도 알린다.
      showToast("GitHub 연결을 시작하지 못했어요. 잠시 후 다시 시도해주세요");
      setBusy(false);
    }
  }

  // 이 GitHub에 이미 저장된 보드가 있다 — 그 보드로 로그인한다(지금 브라우저의 익명 기록은 그대로 둔다).
  // 시작에 실패하면 토스트로 알리고 false를 돌려준다.
  function signInToSavedBoard(): Promise<boolean> {
    setSessionOnlyLogin(true);
    return getBrowserSupabase()
      .auth.signInWithOAuth({ provider: "github", options: oauthOptions() })
      .then(({ error }) => {
        if (!error) return true;
        setSessionOnlyLogin(false);
        console.error("GitHub 로그인 시작 실패:", error.message);
        showToast("GitHub 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요");
        return false;
      });
  }

  function handleSignInExisting() {
    setBusy(true);
    setPending("github");
    void signInToSavedBoard().then((ok) => {
      if (!ok) {
        setBusy(false);
        setPending(null);
      }
    });
  }

  useEffect(() => {
    if (autoSwitch) void signInToSavedBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 돌아온 오류 코드를 보고 한 번만 실행한다.
  }, [autoSwitch]);

  async function handleSignOut() {
    setPending("signout");
    pendingRef.current = "signout";
    setAccount(null);
    // 새 익명 계정이 안 만들어지는 경우(Turnstile 확인이 필요하거나 실패)에도 화면이 덮인 채 멈추지 않게.
    setTimeout(() => {
      if (pendingRef.current === "signout") setPending(null);
    }, 20000);
    // 다음에 만들어질 익명 계정은 다시 오래 유지돼야 한다(지우는 쿠키는 표시와 상관없이 지워진다).
    setSessionOnlyLogin(false);
    await getBrowserSupabase().auth.signOut();
    // 세션이 없어지면 첫 방문처럼 새 익명 계정이 만들어진다. GitHub로 다시 로그인하면 기록이 돌아온다.
    router.refresh();
  }

  async function handleToggleRemember() {
    const next = !remember;
    setRemember(next);
    setSessionOnlyLogin(!next);
    // 세션 쿠키를 지금 설정대로 다시 쓴다(유지 → 만료일 400일, 안 함 → 브라우저를 닫으면 사라짐).
    const { error } = await getBrowserSupabase().auth.refreshSession();
    if (error) {
      setRemember(!next);
      setSessionOnlyLogin(next);
      showToast("설정을 바꾸지 못했어요. 잠시 후 다시 시도해주세요");
      return;
    }
  }

  function clearError() {
    router.replace(pathname);
  }

  return (
    <>
      {account === undefined ? (
        <span aria-hidden className="inline-block size-8 max-sm:size-9" />
      ) : account ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${account.login} 계정`}
              title={account.login}
              className="inline-flex size-8 max-sm:size-9 items-center justify-center overflow-hidden rounded-full border bg-card hover:bg-accent"
            >
              {account.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- GitHub 아바타 한 장, 이미지 최적화 설정 없이 쓴다.
                <img src={account.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <GithubMark className="size-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          {/* 폭을 고정 — 스위치를 켜고 끌 때 아래 설명 길이가 바뀌어도 메뉴 폭이 흔들리지 않게. */}
          <DropdownMenuContent align="end" className="w-60 max-sm:w-64">
            <p className="px-2 py-1.5 text-[12px] text-muted-foreground max-sm:px-3 max-sm:py-2 max-sm:text-[13px]">@{account.login}로 연결됨</p>
            <div className="-mx-1 my-1 h-px bg-border" />
            {/* 동작이 아니라 켜고 끄는 설정이라 스위치 + 지금 상태에서 어떻게 되는지 한 줄. 기본은 꺼짐 — 공용
                컴퓨터에서 로그아웃을 깜빡해도 브라우저를 닫으면 끝나게. 메뉴는 닫지 않는다. */}
            <DropdownMenuItem
              role="menuitemcheckbox"
              aria-checked={remember}
              className="items-start justify-between gap-3"
              onSelect={(e) => {
                e.preventDefault();
                void handleToggleRemember();
              }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>로그인 유지</span>
                <span className="text-[11.5px] text-muted-foreground max-sm:text-[12.5px]">
                  {remember ? "브라우저를 닫아도 로그인돼 있어요" : "브라우저를 닫으면 로그아웃돼요"}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 transition-colors",
                  remember ? "bg-foreground" : "bg-muted-foreground/30"
                )}
              >
                <span
                  className={cn(
                    "size-3.5 rounded-full bg-background shadow-sm transition-transform",
                    remember && "translate-x-3.5"
                  )}
                />
              </span>
            </DropdownMenuItem>
            <div className="-mx-1 my-1 h-px bg-border" />
            <DropdownMenuItem onSelect={() => openFeedback()}>의견 보내기</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/privacy">개인정보처리방침</Link>
            </DropdownMenuItem>
            <div className="-mx-1 my-1 h-px bg-border" />
            <DropdownMenuItem onSelect={handleSignOut}>로그아웃</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onRequestDeleteAccount}>
              계정과 모든 기록 지우기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={handleLink}
          disabled={busy}
          title="연결하면 다른 기기·브라우저에서도 같은 기록을 볼 수 있어요"
          className="inline-flex h-8 max-sm:h-9 max-sm:text-[13px] items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium whitespace-nowrap hover:bg-accent disabled:opacity-60"
        >
          <GithubMark className="size-3.5" />
          GitHub 연결
        </button>
      )}

      <Dialog open={errorKind !== null && !autoSwitch} onOpenChange={(open) => !open && clearError()}>
        <DialogContent showCloseButton={false} className="flex flex-col gap-5 overflow-hidden rounded-xl p-5 sm:max-w-[340px]">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-[15px] font-medium">
              {errorKind === "already_linked" ? "GitHub에 저장된 보드로 전환할까요?" : "GitHub 연결에 실패했어요"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              {errorKind === "already_linked" ? describeLocalData(localCounts) : "잠시 후 다시 시도해주세요."}
            </DialogDescription>
          </div>
          {errorKind === "already_linked" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearError}
                className="h-9 rounded-lg bg-muted text-[13px] font-medium hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSignInExisting}
                disabled={busy}
                className="h-9 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
              >
                전환
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={clearError}
              className="h-9 rounded-lg bg-muted text-[13px] font-medium hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]"
            >
              확인
            </button>
          )}
        </DialogContent>
      </Dialog>
      {(pending ?? (autoSwitch ? "github" : null)) && (
        // 로그인·로그아웃 중 — 화면을 흐리게 덮어 다른 걸 못 누르게 하고, 무슨 중인지 가운데에.
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
          <p role="status" className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm shadow-sm ring-1 ring-border">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            {(pending ?? "github") === "signout" ? "로그아웃하는 중이에요" : "GitHub로 이동하는 중이에요"}
          </p>
        </div>
      )}

      <Dialog open={signedOutNotice} onOpenChange={setSignedOutNotice}>
        <DialogContent showCloseButton={false} className="flex flex-col gap-5 overflow-hidden rounded-xl p-5 sm:max-w-[340px]">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-[15px] font-medium">로그아웃했어요</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              내 기기라면 이대로 괜찮아요. 공용 컴퓨터였다면 GitHub에서도 로그아웃해주세요. 이 브라우저에 GitHub
              로그인이 남아 있으면 다른 사람이 “GitHub 연결”로 들어올 수 있어요.
            </DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSignedOutNotice(false)}
              className="h-9 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground max-sm:h-10 hover:bg-primary/80"
            >
              확인
            </button>
            <a
              href="https://github.com/logout"
              target="_blank"
              rel="noreferrer"
              onClick={() => setSignedOutNotice(false)}
              className="flex h-9 items-center justify-center rounded-lg bg-muted text-[13px] font-medium max-sm:h-10 hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]"
            >
              GitHub 로그아웃 →
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function readNoticeSeen(): boolean {
  try {
    return localStorage.getItem(SIGNED_OUT_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

function markNoticeSeen() {
  try {
    localStorage.setItem(SIGNED_OUT_NOTICE_KEY, "1");
  } catch {
    // 저장이 막힌 브라우저면 다음에 한 번 더 보일 뿐이다.
  }
}

// "이 브라우저에 넣은 공고 3개와 내 자료 1개는 옮겨지지 않아요." — 있는 것만 센다.
function describeLocalData({ applications, materials }: { applications: number; materials: number }): string {
  const parts = [
    applications > 0 ? `공고 ${applications}개` : null,
    materials > 0 ? `내 자료 ${materials}개` : null,
  ].filter(Boolean);
  return `이 브라우저에 넣은 ${parts.join("와 ")}는 옮겨지지 않아요.`;
}
