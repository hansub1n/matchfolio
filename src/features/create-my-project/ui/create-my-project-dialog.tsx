"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createMyProject } from "@/entities/my-project";
import { extractProject } from "@/features/extract-project";
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

export function CreateMyProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [highlights, setHighlights] = useState("");
  const [pending, setPending] = useState(false);

  const [githubUrl, setGithubUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setTechStack("");
    setHighlights("");
    setGithubUrl("");
    setPasteText("");
  }

  async function handleExtract(input: { githubUrl: string } | { text: string }) {
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractProject(input);
      setName(extracted.name);
      setDescription(extracted.description);
      setTechStack(extracted.techStack.join(", "));
      setHighlights(extracted.highlights.join(", "));
    } catch (error) {
      console.warn("프로젝트 정보 추출 실패:", error);
      setExtractError(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    try {
      await createMyProject({
        name: name.trim(),
        description: description.trim() || null,
        techStack: techStack
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean),
        highlights: highlights
          .split(",")
          .map((highlight) => highlight.trim())
          .filter(Boolean),
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ 프로젝트 추가</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>내 프로젝트 추가</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="GitHub 저장소 URL"
              disabled={extracting}
              className={`flex-1 ${inputClassName}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={extracting || !githubUrl.trim()}
              onClick={() => handleExtract({ githubUrl: githubUrl.trim() })}
            >
              불러오기
            </Button>
          </div>
          <div className="flex gap-1.5">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="또는 README/블로그 글 등 설명 텍스트를 붙여넣기"
              rows={3}
              disabled={extracting}
              className={`flex-1 ${inputClassName}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={extracting || !pasteText.trim()}
              onClick={() => handleExtract({ text: pasteText.trim() })}
            >
              불러오기
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {extracting
              ? "프로젝트 정보를 추출하는 중..."
              : "둘 다 건너뛰고 아래 칸을 직접 채워도 돼요."}
          </p>
          {extractError && <p className="text-xs text-destructive">{extractError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="프로젝트 이름"
            className={inputClassName}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="한 줄 소개 (예: 러닝 루틴을 기록하는 개인 프로젝트)"
            rows={2}
            className={inputClassName}
          />
          <input
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            placeholder="기술스택 (쉼표로 구분, 예: React, TypeScript, Supabase)"
            className={inputClassName}
          />
          <textarea
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="주요 기능/경험 (쉼표로 구분, 예: 낙관적 업데이트, 무한스크롤, 동시성 제어)"
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
