"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createApplication } from "@/entities/application";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

export function CreateApplicationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    setPending(true);
    try {
      await createApplication({ company: company.trim(), position: position.trim() });
      setCompany("");
      setPosition("");
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
        <Button variant="outline">+ 카드 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카드 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="회사명"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="직무"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
