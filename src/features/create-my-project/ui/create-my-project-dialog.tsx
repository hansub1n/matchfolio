"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createMyProject, joinHighlights, parseHighlights } from "@/entities/my-project";
import { extractProject } from "@/features/extract-project";
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
import { ExtractingPanel } from "@/shared/ui/extracting-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TagInput } from "@/shared/ui/tag-input";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export type MyProjectSourceTab = "github" | "paste" | "manual";
type SourceTab = MyProjectSourceTab;
type AiField = "name" | "description" | "techStack" | "highlights";

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

function draftAiFields(draft: MyProjectDraft | undefined): Set<AiField> {
  const fields = new Set<AiField>();
  if (!draft) return fields;
  if (draft.name) fields.add("name");
  if (draft.description) fields.add("description");
  if (draft.techStack.length > 0) fields.add("techStack");
  if (draft.highlights.length > 0) fields.add("highlights");
  return fields;
}

export interface MyProjectDraft {
  name: string;
  description: string;
  techStack: string[];
  highlights: string[];
}

export function CreateMyProjectDialog({
  trigger,
  initialTab = "github",
  initialValues,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  onCreated,
}: {
  trigger?: ReactNode;
  // 빈 상태의 "직접 입력" 버튼처럼 특정 탭으로 바로 열 때.
  initialTab?: MyProjectSourceTab;
  // 인라인 등록에서 불러온 결과를 "수정"할 때 — 직접 입력 탭에 채운 채로 연다.
  initialValues?: MyProjectDraft;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
} = {}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const startTab: SourceTab = initialValues ? "manual" : initialTab;
  const [sourceTab, setSourceTab] = useState<SourceTab>(startTab);
  const [githubUrl, setGithubUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [techStack, setTechStack] = useState<string[]>(initialValues?.techStack ?? []);
  const [highlights, setHighlights] = useState(joinHighlights(initialValues?.highlights ?? []));
  const [aiFilled, setAiFilled] = useState<Set<AiField>>(() => draftAiFields(initialValues));
  const [pending, setPending] = useState(false);

  const showForm = sourceTab === "manual" || loaded;

  function reset() {
    setSourceTab(startTab);
    setGithubUrl("");
    setPasteText("");
    setExtractError(null);
    setLoaded(false);
    setName(initialValues?.name ?? "");
    setDescription(initialValues?.description ?? "");
    setTechStack(initialValues?.techStack ?? []);
    setHighlights(joinHighlights(initialValues?.highlights ?? []));
    setAiFilled(draftAiFields(initialValues));
  }

  async function handleExtract(input: { githubUrl: string } | { text: string }) {
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractProject(input);
      setName(extracted.name);
      setDescription(extracted.description);
      setTechStack(extracted.techStack);
      setHighlights(joinHighlights(extracted.highlights));
      const filled = new Set<AiField>();
      if (extracted.name) filled.add("name");
      if (extracted.description) filled.add("description");
      if (extracted.techStack.length > 0) filled.add("techStack");
      if (extracted.highlights.length > 0) filled.add("highlights");
      setAiFilled(filled);
      setLoaded(true);
    } catch (error) {
      console.warn("프로젝트 정보 추출 실패:", error);
      setExtractError(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setExtracting(false);
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
    if (!name.trim()) return;

    setPending(true);
    try {
      await createMyProject({
        name: name.trim(),
        description: description.trim() || null,
        techStack,
        highlights: parseHighlights(highlights),
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
              프로젝트 추가
            </button>
          )}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
        </DialogHeader>

        <Tabs value={sourceTab} onValueChange={(value) => setSourceTab(value as SourceTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="github">GitHub 주소</TabsTrigger>
            <TabsTrigger value="paste">텍스트 붙여넣기</TabsTrigger>
            <TabsTrigger value="manual">직접 입력</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="flex flex-col gap-2 pt-2">
            {extracting ? (
              <ExtractingPanel previewUrl={null} label="프로젝트 정보를 읽는 중" />
            ) : (
              <div className="flex gap-1.5">
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="GitHub 저장소 URL"
                  className={`flex-1 ${inputClassName}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!githubUrl.trim()}
                  onClick={() => handleExtract({ githubUrl: githubUrl.trim() })}
                >
                  불러오기
                </Button>
              </div>
            )}
            {extractError && <p className="text-xs text-destructive">{extractError}</p>}
          </TabsContent>

          <TabsContent value="paste" className="flex flex-col gap-2 pt-2">
            {extracting ? (
              <ExtractingPanel previewUrl={null} label="프로젝트 정보를 읽는 중" />
            ) : (
              <div className="flex gap-1.5">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="README나 devlog 등 설명 텍스트를 붙여넣으세요"
                  rows={3}
                  className={`flex-1 ${inputClassName}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pasteText.trim()}
                  onClick={() => handleExtract({ text: pasteText.trim() })}
                >
                  불러오기
                </Button>
              </div>
            )}
            {extractError && <p className="text-xs text-destructive">{extractError}</p>}
          </TabsContent>

          <TabsContent value="manual" />
        </Tabs>

        {showForm && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("name")}>프로젝트 이름</FieldLabel>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearAiFilled("name");
                }}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel aiFilled={aiFilled.has("description")}>한 줄 소개</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearAiFilled("description");
                }}
                rows={2}
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
              <FieldLabel aiFilled={aiFilled.has("highlights")}>핵심 포인트</FieldLabel>
              <textarea
                value={highlights}
                onChange={(e) => {
                  setHighlights(e.target.value);
                  clearAiFilled("highlights");
                }}
                placeholder="한 줄에 하나씩 적어주세요"
                rows={3}
                className={inputClassName}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
