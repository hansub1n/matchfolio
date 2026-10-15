"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { InterestedCompany } from "@/entities/interested-company";
import { CreateApplicationDialog } from "@/features/create-application";
import { formatDeadline } from "@/shared/lib/format-deadline";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function InterestedCompanyCard({
  company,
  onOpenDetail,
  onDelete,
  onConvert,
}: {
  company: InterestedCompany;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConvert?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const deadlineLabel = formatDeadline(company.deadline);

  return (
    <>
      <Card size="sm" className="relative w-64">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="absolute top-1.5 right-1.5 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          <span className="sr-only">삭제</span>
        </button>
        <CardHeader>
          <CardTitle className="pr-4">{company.company}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {company.position && (
            <p className="text-sm text-muted-foreground">{company.position}</p>
          )}
          <div className="flex flex-col gap-1.5">
            {company.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {company.techStack.slice(0, 2).map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {deadlineLabel && (
              <span className="text-xs text-muted-foreground">{deadlineLabel}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onOpenDetail?.(company.id)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              자세히 보기
            </button>
            <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
              지원하기
            </Button>
          </div>
        </CardContent>
      </Card>
      <CreateApplicationDialog
        trigger={null}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        initialValues={{
          company: company.company,
          position: company.position ?? "",
          deadline: company.deadline,
          jobPostingUrl: company.jobPostingUrl,
          techStack: company.techStack,
          description: company.description,
          memo: company.memo,
          screenshotPaths: company.screenshotPaths,
        }}
        onCreated={() => onConvert?.(company.id)}
      />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{company.company} 카드를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(company.id);
                setConfirmOpen(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
