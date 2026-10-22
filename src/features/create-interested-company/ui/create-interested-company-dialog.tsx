"use client";

import { useState, type ClipboardEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createInterestedCompany } from "@/entities/interested-company";
import { extractJobPosting } from "@/features/extract-job-posting";
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

export function CreateInterestedCompanyDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const [step, setStep] = useState<Step>("drop");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const previewUrl = useObjectUrl(previewFile);

  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);
  const [aiFilled, setAiFilled] = useState<Set<AiField>>(new Set());
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setStep("drop");
    setPreviewFile(null);
    setCompany("");
    setPosition("");
    setDeadline("");
    setJobPostingUrl("");
    setTechStack([]);
    setDescription("");
    setMemo("");
    setScreenshotPaths([]);
    setAiFilled(new Set());
    setExtractError(null);
  }

  async function extractFromFiles(files: File[]) {
    setPreviewFile(files[0] ?? null);
    setStep("extracting");
    setExtractError(null);
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
    if (!company.trim()) return;

    setPending(true);
    try {
      await createInterestedCompany({
        company: company.trim(),
        position: position.trim() || null,
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
      console.error(error);
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? <Button>+ 관심기업 추가</Button>}</DialogTrigger>
      )}
      <DialogContent onPaste={handlePaste} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>관심기업 추가</DialogTitle>
        </DialogHeader>

        {step === "drop" && (
          <div className="flex flex-col gap-2">
            <Dropzone onFiles={extractFromFiles} />
            <button
              type="button"
              onClick={() => setStep("form")}
              className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              직접 입력할게요
            </button>
            {extractError && <p className="text-xs text-destructive">{extractError}</p>}
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

            <DialogFooter className="py-3">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={pending || !company.trim()}>
                {pending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
