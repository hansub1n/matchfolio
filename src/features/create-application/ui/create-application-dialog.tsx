"use client";

import {
  useState,
  type ClipboardEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { useRouter } from "next/navigation";

import { createApplication } from "@/entities/application";
import {
  extractFromUrl,
  LINK_READING_ENABLED,
  LinkError,
  SUPPORTED_SITE_LABELS,
  type LinkExtraction,
} from "@/features/extract-from-url";
import { ExtractError, extractJobPosting } from "@/features/extract-job-posting";
import { track } from "@/shared/lib/analytics";
import { requestOpenApplication } from "@/shared/lib/application-open-store";
import { openFeedback } from "@/shared/lib/feedback-store";
import { todayKST } from "@/shared/lib/kst-date";
import { MAX_SCREENSHOTS } from "@/shared/config/constants";
import { useObjectUrl } from "@/shared/lib/use-object-url";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Dropzone } from "@/shared/ui/dropzone";
import { ExtractingPanel } from "@/shared/ui/extracting-panel";
import { TagInput } from "@/shared/ui/tag-input";
import { showToast } from "@/shared/ui/toast";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Step = "drop" | "extracting" | "form";
// 링크 실패 안내의 "스크린샷으로 넣기"가 드롭존의 파일 고르기를 연다.
const SCREENSHOT_INPUT_ID = "create-application-screenshot-input";
// 새 공고는 보통 "괜찮아 보여서 저장해둘 때" 캡처하므로 관심이 기본. 이미 지원한
// 공고를 나중에 기록할 때만 지원 완료를 고른다.
export type CreateApplicationStatus = "interested" | "applied";
type AiField = "company" | "position" | "deadline" | "techStack" | "description";

function FieldLabel({ children, aiFilled }: { children: ReactNode; aiFilled: boolean }) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      {children}
      {aiFilled && (
        <span title="AI가 채웠어요" className="inline-block size-1.5 rounded-full bg-highlight" />
      )}
    </label>
  );
}

const STATUS_OPTIONS: { value: CreateApplicationStatus; label: string }[] = [
  { value: "interested", label: "관심" },
  { value: "applied", label: "지원 완료" },
];

export function CreateApplicationDialog({
  trigger,
  initialStatus = "interested",
  initialFiles,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactNode;
  initialStatus?: CreateApplicationStatus;
  // 보드 컬럼에 스크린샷을 놓거나 보드에 붙여넣은 경우 — 모아두는 칸에 미리 넣어둔다(더 붙여넣고 "공고 읽기").
  initialFiles?: File[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const [step, setStep] = useState<Step>("drop");
  // 읽기 전에 모아두는 스크린샷 — 한 공고를 여러 장으로 캡처한 경우 다 모은 뒤 한 번에 읽는다.
  const [pendingFiles, setPendingFiles] = useState<File[]>(() => (initialFiles ?? []).slice(0, MAX_SCREENSHOTS));
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewUrl = useObjectUrl(previewFile);

  const [status, setStatus] = useState<CreateApplicationStatus>(initialStatus);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [appliedAt, setAppliedAt] = useState(todayKST());
  const [deadline, setDeadline] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);
  const [aiFilled, setAiFilled] = useState<Set<AiField>>(new Set());
  // AI가 처음 채운 칸 수 — 저장할 때 남은 표시와 비교해 사용자가 고친 칸 수를 센다(사용 기록 extract_edited).
  const [aiFilledCount, setAiFilledCount] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  // 폼이 AI 추출 결과로 채워졌는지 — 직접 입력일 때는 안내 문구를 숨긴다.
  const [fromAi, setFromAi] = useState(false);
  // 어디서 읽었는지(스크린샷/링크) — 안내 문구와 사용 기록(card_created method)에.
  const [source, setSource] = useState<"screenshot" | "url">("screenshot");
  // 링크로 넣기 — 입력칸 값과 실패(이유별로 다른 안내).
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<LinkError | null>(null);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setStep("drop");
    setPendingFiles([]);
    setPreviewFile(null);
    setStatus(initialStatus);
    setCompany("");
    setPosition("");
    setAppliedAt(todayKST());
    setDeadline("");
    setJobPostingUrl("");
    setTechStack([]);
    setDescription("");
    setMemo("");
    setScreenshotPaths([]);
    setAiFilled(new Set());
    setAiFilledCount(0);
    setExtractError(null);
    setFromAi(false);
    setSource("screenshot");
    setLinkUrl("");
    setLinkError(null);
    setSubmitError(null);
  }

  // 놓거나 붙여넣은 스크린샷을 모아두는 칸에 더한다. 같은 파일을 두 번 넣으면 한 번만, 최대 MAX_SCREENSHOTS장.
  function addFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setExtractError(null);
    const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
    const seen = new Set(pendingFiles.map(key));
    const next = [...pendingFiles, ...images.filter((f) => !seen.has(key(f)))];
    if (next.length > MAX_SCREENSHOTS) showToast(`최대 ${MAX_SCREENSHOTS}장까지 넣을 수 있어요`);
    setPendingFiles(next.slice(0, MAX_SCREENSHOTS));
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function startExtraction() {
    if (pendingFiles.length === 0) return;
    setPreviewFile(pendingFiles[0]);
    setStep("extracting");
    setExtractError(null);
    void runExtraction(pendingFiles);
  }

  // AI·링크로 읽은 값으로 폼을 채운다 — 채운 칸은 라벨 옆 점으로 표시.
  function fillForm(extracted: { company: string; position: string; deadline: string | null; techStack: string[]; description: string }) {
    setCompany(extracted.company);
    setPosition(extracted.position);
    setDeadline(extracted.deadline ?? "");
    setTechStack(extracted.techStack);
    setDescription(extracted.description);
    const filled = new Set<AiField>();
    if (extracted.company) filled.add("company");
    if (extracted.position) filled.add("position");
    if (extracted.deadline) filled.add("deadline");
    if (extracted.techStack.length > 0) filled.add("techStack");
    if (extracted.description) filled.add("description");
    setAiFilled(filled);
    setAiFilledCount(filled.size);
    setFromAi(true);
    setStep("form");
  }

  async function runExtraction(files: File[]) {
    try {
      const extracted = await extractJobPosting(files);
      setScreenshotPaths(extracted.screenshotPaths);
      setSource("screenshot");
      fillForm(extracted);
    } catch (error) {
      console.warn("스크린샷 추출 실패:", error);
      if (error instanceof ExtractError && error.reason) track("extract_failed", { reason: error.reason });
      setExtractError(error instanceof Error ? error.message : "알 수 없는 오류");
      setStep("drop");
    }
  }

  async function readLink(raw: string) {
    const url = raw.trim();
    if (!url) return;
    setLinkUrl(url);
    setLinkError(null);
    setExtractError(null);
    setPreviewFile(null);
    setStep("extracting");
    try {
      const extracted: LinkExtraction = await extractFromUrl(url);
      track("link_read", { site: extracted.site, method: extracted.method });
      setJobPostingUrl(extracted.sourceUrl);
      setSource("url");
      fillForm(extracted);
    } catch (error) {
      const linkFailure =
        error instanceof LinkError ? error : new LinkError("이 링크는 읽지 못했어요", "network", null);
      track("link_failed", { site: linkFailure.site ?? "unknown", reason: linkFailure.reason });
      setLinkError(linkFailure);
      setStep("drop");
    }
  }

  // "스크린샷으로 넣기" — 링크 실패 안내를 걷고 파일 고르기를 연다(드롭존의 숨은 입력칸).
  function switchToScreenshot() {
    setLinkError(null);
    setLinkUrl("");
    document.getElementById(SCREENSHOT_INPUT_ID)?.click();
  }

  function openExistingCard(applicationId: string) {
    handleOpenChange(false);
    requestOpenApplication(applicationId);
  }

  function switchToManualInput() {
    setExtractError(null);
    setFromAi(false);
    setStep("form");
  }

  function handlePaste(e: ClipboardEvent) {
    if (step !== "drop") return;
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length > 0) {
      addFiles(files);
      return;
    }
    // 입력칸 밖에서 공고 주소를 붙여넣으면 바로 링크로 읽는다(링크 입력칸 안에서는 평소처럼 붙여넣기만).
    const target = e.target as HTMLElement;
    if (!LINK_READING_ENABLED || target.closest("input, textarea")) return;
    const text = e.clipboardData.getData("text").trim();
    if (/^https?:\/\/\S+$/.test(text)) {
      e.preventDefault();
      void readLink(text);
    }
  }

  function clearAiFilled(field: AiField) {
    setAiFilled((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setSubmitError(null);
    try {
      await createApplication({
        company: company.trim(),
        position: position.trim() || null,
        stage: isApplied ? "document" : "interested",
        appliedAt: isApplied ? appliedAt || null : null,
        deadline: deadline || null,
        jobPostingUrl: jobPostingUrl.trim() || null,
        screenshotPaths,
        description: description.trim() || null,
        memo: memo.trim() || null,
        techStack,
      });
      track("card_created", { method: fromAi ? source : "manual", stage: isApplied ? "document" : "interested" });
      if (fromAi) track("extract_edited", { fields_changed: aiFilledCount - aiFilled.size });
      reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("공고 추가 실패:", error);
      setSubmitError("추가하지 못했습니다. 입력값을 확인하고 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }

  const isApplied = status === "applied";
  // 관심 단계는 직무가 정해지지 않았을 수 있어서 지원 완료일 때만 직무를 필수로 받는다.
  const canSubmit = Boolean(company.trim()) && (!isApplied || Boolean(position.trim()));

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && blockInSampleMode()) return;
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? (
            <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs max-sm:px-4 max-sm:py-2.5 max-sm:text-[13px] text-primary-foreground">
              공고 추가
            </button>
          )}</DialogTrigger>
      )}
      <DialogContent onPaste={handlePaste} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>공고 추가</DialogTitle>
        </DialogHeader>

        {step === "drop" && (
          <div className="flex flex-col gap-2">
            <Dropzone
              onFiles={addFiles}
              files={pendingFiles}
              onRemove={removeFile}
              maxFiles={MAX_SCREENSHOTS}
              inputId={SCREENSHOT_INPUT_ID}
            />
            {/* 링크로 넣기 — 스크린샷을 모으는 중엔 숨긴다(둘 중 하나로). 입력칸 밖에서 주소를 붙여넣어도 읽는다. */}
            {LINK_READING_ENABLED && pendingFiles.length === 0 && (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void readLink(linkUrl);
                }}
              >
                <input
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setLinkError(null);
                  }}
                  inputMode="url"
                  placeholder={`${SUPPORTED_SITE_LABELS.join("·")} 공고 링크`}
                  aria-label="공고 링크"
                  className={`min-w-0 flex-1 ${inputClassName}`}
                />
                <Button type="submit" variant="outline" size="sm" className="shrink-0" disabled={!linkUrl.trim()}>
                  읽기
                </Button>
              </form>
            )}
            {linkError &&
              (linkError.reason === "duplicate" && linkError.applicationId ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                  <p className="text-xs text-foreground">이미 추가한 공고예요</p>
                  <button
                    type="button"
                    onClick={() => openExistingCard(linkError.applicationId!)}
                    className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs max-sm:px-4 max-sm:py-2.5 max-sm:text-[13px] hover:bg-accent"
                  >
                    그 카드 열기
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-xs text-foreground">
                      {linkError.reason === "unsupported" ? "아직 지원하지 않는 사이트예요" : "이 링크는 읽지 못했어요"}
                    </p>
                    {linkError.reason !== "unsupported" && (
                      <p className="text-[11.5px] text-muted-foreground">{linkError.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={switchToScreenshot}
                    className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs max-sm:px-4 max-sm:py-2.5 max-sm:text-[13px] hover:bg-accent"
                  >
                    스크린샷으로 넣기
                  </button>
                </div>
              ))}
            {extractError ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                  <p className="text-xs text-foreground">{extractError}</p>
                  <button
                    type="button"
                    onClick={switchToManualInput}
                    className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs max-sm:px-4 max-sm:py-2.5 max-sm:text-[13px] hover:bg-accent"
                  >
                    직접 입력하기
                  </button>
                </div>
                {/* 캡처 이미지는 보내지 않는다(개인정보) — 어디서 실패했는지만 page="extract"로. */}
                <button
                  type="button"
                  onClick={() => openFeedback({ kind: "inconvenient", page: "extract" })}
                  className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  결과가 이상했나요? 알려주기
                </button>
              </>
            ) : null}
            {pendingFiles.length > 0 ? (
              // 모은 스크린샷을 한 번에 읽는다 — 한 공고를 여러 장으로 캡처했으면 다 붙여넣은 뒤 누르면 된다.
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={switchToManualInput}
                  className={cn(
                    "text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
                    extractError && "invisible"
                  )}
                >
                  직접 입력할게요
                </button>
                <Button type="button" onClick={startExtraction}>
                  {extractError ? "다시 읽기" : "공고 읽기"} · {pendingFiles.length}장
                </Button>
              </div>
            ) : (
              !extractError && (
                <button
                  type="button"
                  onClick={switchToManualInput}
                  className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  직접 입력할게요
                </button>
              )
            )}
          </div>
        )}

        {step === "extracting" && (
          <ExtractingPanel previewUrl={previewUrl} label={previewFile ? "공고 읽는 중" : "링크 읽는 중"} />
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {fromAi && (
              <p className="text-[11.5px] text-muted-foreground">
                {source === "url" ? "링크에서 읽은 내용이에요" : "AI가 스크린샷에서 읽은 내용이에요"}. 저장 전에 한 번
                확인해주세요
              </p>
            )}
            {screenshotPaths.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {screenshotPaths.map((path) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={path}
                      src={`/api/screenshot?path=${encodeURIComponent(path)}`}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover object-top ring-1 ring-foreground/10"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("drop")}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  다시 올리기
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">상태</label>
              <div className="flex gap-1 self-start rounded-full bg-muted p-0.5">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs",
                      status === option.value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("company")}>회사명</FieldLabel>
              <input
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  clearAiFilled("company");
                }}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("position")}>직무</FieldLabel>
              <input
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  clearAiFilled("position");
                }}
                className={inputClassName}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isApplied && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">지원일</label>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <FieldLabel aiFilled={aiFilled.has("deadline")}>마감일</FieldLabel>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value);
                    clearAiFilled("deadline");
                  }}
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">공고 링크</label>
              <input
                value={jobPostingUrl}
                onChange={(e) => setJobPostingUrl(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("techStack")}>기술스택</FieldLabel>
              <TagInput
                value={techStack}
                onChange={(tags) => {
                  setTechStack(tags);
                  clearAiFilled("techStack");
                }}
                placeholder="입력 후 Enter"
              />
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("description")}>공고 요약</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearAiFilled("description");
                }}
                rows={6}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className={inputClassName}
              />
            </div>

            {submitError && <p className="text-xs text-destructive">{submitError}</p>}

            <DialogFooter className="py-3">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" className="min-w-16" disabled={pending || !canSubmit}>
                {pending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
