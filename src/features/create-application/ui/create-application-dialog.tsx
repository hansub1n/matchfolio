"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { createApplication } from "@/entities/application";
import { extractJobPosting } from "@/features/extract-job-posting";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export interface CreateApplicationInitialValues {
  company?: string;
  position?: string;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  techStack?: string[];
  description?: string | null;
  memo?: string | null;
  screenshotPaths?: string[];
}

export function CreateApplicationDialog({
  trigger,
  initialValues,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  onCreated,
}: {
  trigger?: ReactNode;
  initialValues?: CreateApplicationInitialValues;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
} = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [company, setCompany] = useState(initialValues?.company ?? "");
  const [position, setPosition] = useState(initialValues?.position ?? "");
  const [deadline, setDeadline] = useState(initialValues?.deadline ?? "");
  const [jobPostingUrl, setJobPostingUrl] = useState(initialValues?.jobPostingUrl ?? "");
  const [techStack, setTechStack] = useState(initialValues?.techStack?.join(", ") ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>(
    initialValues?.screenshotPaths ?? []
  );
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setCompany(initialValues?.company ?? "");
    setPosition(initialValues?.position ?? "");
    setDeadline(initialValues?.deadline ?? "");
    setJobPostingUrl(initialValues?.jobPostingUrl ?? "");
    setTechStack(initialValues?.techStack?.join(", ") ?? "");
    setDescription(initialValues?.description ?? "");
    setMemo(initialValues?.memo ?? "");
    setScreenshotPaths(initialValues?.screenshotPaths ?? []);
  }

  async function extractFromFiles(files: File[]) {
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractJobPosting(files);
      setCompany(extracted.company);
      setPosition(extracted.position);
      setDeadline(extracted.deadline ?? "");
      setTechStack(extracted.techStack.join(", "));
      setDescription(extracted.description);
      setScreenshotPaths(extracted.screenshotPaths);
    } catch (error) {
      console.warn("스크린샷 추출 실패:", error);
      setExtractError(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) extractFromFiles(files);
  }

  function handlePaste(e: ClipboardEvent) {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length > 0) extractFromFiles(files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    setPending(true);
    try {
      await createApplication({
        company: company.trim(),
        position: position.trim(),
        deadline: deadline || null,
        jobPostingUrl: jobPostingUrl.trim() || null,
        screenshotPaths,
        description: description.trim() || null,
        memo: memo.trim() || null,
        techStack: techStack
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean),
      });
      reset();
      setOpen(false);
      onCreated?.();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? <Button>+ 카드 추가</Button>}</DialogTrigger>
      )}
      <DialogContent onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>카드 추가</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={extracting}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {extracting
              ? "스크린샷에서 정보를 추출하는 중..."
              : "공고가 길어서 여러 장으로 나눠 캡처했다면 한꺼번에 선택하거나 붙여넣어도(Ctrl+V/Cmd+V) 돼요."}
          </p>
          {extractError && <p className="text-xs text-destructive">{extractError}</p>}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="회사명"
            className={inputClassName}
          />
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="직무"
            className={inputClassName}
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClassName}
          />
          <input
            value={jobPostingUrl}
            onChange={(e) => setJobPostingUrl(e.target.value)}
            placeholder="공고 링크 (선택)"
            className={inputClassName}
          />
          <input
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            placeholder="기술스택 (쉼표로 구분, 예: React, TypeScript)"
            className={inputClassName}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="공고 요약 (스크린샷 업로드 시 자동 채워짐)"
            rows={3}
            className={inputClassName}
          />
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className={inputClassName}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
