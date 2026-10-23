"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { useRouter } from "next/navigation";

import { createApplication } from "@/entities/application";
import { extractJobPosting } from "@/features/extract-job-posting";
import { todayKST } from "@/shared/lib/kst-date";
import { useObjectUrl } from "@/shared/lib/use-object-url";
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

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Step = "drop" | "extracting" | "form";
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
  // 보드 컬럼에 스크린샷을 바로 놓은 경우 — 열리자마자 추출을 시작한다.
  initialFiles?: File[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const [step, setStep] = useState<Step>(initialFiles ? "extracting" : "drop");
  const [previewFile, setPreviewFile] = useState<File | null>(initialFiles?.[0] ?? null);
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
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setStep("drop");
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
    setExtractError(null);
    setSubmitError(null);
  }

  function extractFromFiles(files: File[]) {
    setPreviewFile(files[0] ?? null);
    setStep("extracting");
    setExtractError(null);
    void runExtraction(files);
  }

  async function runExtraction(files: File[]) {
    try {
      const extracted = await extractJobPosting(files);
      setCompany(extracted.company);
      setPosition(extracted.position);
      setDeadline(extracted.deadline ?? "");
      setTechStack(extracted.techStack);
      setDescription(extracted.description);
      setScreenshotPaths(extracted.screenshotPaths);
      const filled = new Set<AiField>();
      if (extracted.company) filled.add("company");
      if (extracted.position) filled.add("position");
      if (extracted.deadline) filled.add("deadline");
      if (extracted.techStack.length > 0) filled.add("techStack");
      if (extracted.description) filled.add("description");
      setAiFilled(filled);
      setStep("form");
    } catch (error) {
      console.warn("스크린샷 추출 실패:", error);
      setExtractError(error instanceof Error ? error.message : "알 수 없는 오류");
      setStep("drop");
    }
  }

  // 컬럼에 놓은 파일은 열리는 순간 한 번만 추출한다. 개발 모드(StrictMode)에서
  // effect가 두 번 돌아도 AI 호출이 중복되지 않게 ref로 막는다.
  const startedRef = useRef(false);
  const startInitialExtraction = useEffectEvent(() => {
    if (initialFiles) void runExtraction(initialFiles);
  });
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startInitialExtraction();
  }, []);

  function switchToManualInput() {
    setExtractError(null);
    setStep("form");
  }

  function handlePaste(e: ClipboardEvent) {
    if (step !== "drop") return;
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length > 0) extractFromFiles(files);
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
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? <Button>+ 카드 추가</Button>}</DialogTrigger>
      )}
      <DialogContent onPaste={handlePaste} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>공고 추가</DialogTitle>
        </DialogHeader>

        {step === "drop" && (
          <div className="flex flex-col gap-2">
            <Dropzone onFiles={extractFromFiles} />
            {extractError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                <p className="text-xs text-foreground">{extractError}</p>
                <button
                  type="button"
                  onClick={switchToManualInput}
                  className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent"
                >
                  직접 입력하기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={switchToManualInput}
                className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                직접 입력할게요
              </button>
            )}
          </div>
        )}

        {step === "extracting" && <ExtractingPanel previewUrl={previewUrl} label="공고 읽는 중" />}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              <Button type="submit" disabled={pending || !canSubmit}>
                {pending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
