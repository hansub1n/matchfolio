"use client";

import { useState } from "react";

import {
  deleteInterestedCompany,
  updateInterestedCompany,
  type InterestedCompany,
  type UpdateInterestedCompanyInput,
} from "@/entities/interested-company";

import { InterestedCompanyCard } from "./interested-company-card";
import { InterestedCompanyDetailDialog } from "./interested-company-detail-dialog";

export function Watchlist({ companies }: { companies: InterestedCompany[] }) {
  const [items, setItems] = useState(companies);
  const [prevCompanies, setPrevCompanies] = useState(companies);
  if (companies !== prevCompanies) {
    setPrevCompanies(companies);
    setItems(companies);
  }
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailCompany = items.find((c) => c.id === detailId) ?? null;

  function handleUpdate(id: string, input: UpdateInterestedCompanyInput) {
    setItems((prev) =>
      prev.map((company) =>
        company.id === id
          ? {
              ...company,
              ...input,
              techStack: input.techStack ?? company.techStack,
            }
          : company
      )
    );
    updateInterestedCompany(id, input).catch(console.error);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((company) => company.id !== id));
    setDetailId(null);
    deleteInterestedCompany(id).catch(console.error);
  }

  return (
    <div className="flex flex-wrap gap-2 px-4">
      {items.map((company) => (
        <InterestedCompanyCard
          key={company.id}
          company={company}
          onOpenDetail={setDetailId}
          onDelete={handleDelete}
        />
      ))}
      <InterestedCompanyDetailDialog
        company={detailCompany}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
