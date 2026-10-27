import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";

import { DeleteAccountButton } from "@/features/delete-account";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/ui/accordion";

import { DELETE_ROW, DETAILS, EFFECTIVE_DATE, INTRO, SUMMARY, type DetailBlock, type TransferRow } from "./content";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

// 문구는 content.ts — 여기는 그리기만. 공통 페이지 틀(960px) 안에서 본문은 640px 가운데.
export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[960px] px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <div className="mx-auto flex max-w-[640px] flex-col gap-8">
          <header className="flex flex-col gap-3">
            <Link href="/" className="self-start text-xs text-muted-foreground hover:text-foreground">
              ← 보드로
            </Link>
            <h1 className="text-[22px] font-medium tracking-tight">개인정보처리방침</h1>
            <p className="font-mono text-xs text-muted-foreground">{EFFECTIVE_DATE}</p>
            <p className="text-sm leading-7">
              {INTRO.before}
              <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">{INTRO.highlight}</span>
              {INTRO.after}
            </p>
          </header>

          <section aria-labelledby="summary-title" className="flex flex-col gap-3">
            <h2 id="summary-title" className="text-sm font-medium">
              한눈에 보기
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SUMMARY.map((card) => (
                <div
                  key={card.title}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-xl p-4",
                    card.negative ? "bg-foreground text-background" : "bg-muted"
                  )}
                >
                  <h3 className="text-[13px] font-medium">{card.title}</h3>
                  <ul className="flex flex-col gap-1.5 text-[13px] leading-5">
                    {card.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        {card.negative ? (
                          <span aria-hidden className="shrink-0 font-medium text-highlight">
                            ✕
                          </span>
                        ) : (
                          <span aria-hidden className="shrink-0 text-muted-foreground">
                            ·
                          </span>
                        )}
                        <span className={card.negative ? undefined : "text-muted-foreground"}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="details-title" className="flex flex-col">
            <h2 id="details-title" className="text-sm font-medium">
              자세히
            </h2>
            <Accordion type="multiple" className="mt-2 border-t">
              {DETAILS.map((section) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger>{section.title}</AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-3 leading-7 text-muted-foreground">
                    {section.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
            <p className="text-[13px]">{DELETE_ROW.text}</p>
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </main>
  );
}

function Block({ block }: { block: DetailBlock }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "transfers") return <TransferTable rows={block.rows} />;
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {block.items.map((item) =>
        typeof item === "string" ? (
          <li key={item}>{item}</li>
        ) : (
          <li key={item.text}>
            {item.text}
            <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5">
              {item.children.map((child) => (
                <li key={child}>{child}</li>
              ))}
            </ul>
          </li>
        )
      )}
    </ul>
  );
}

const TRANSFER_COLUMNS: { key: keyof TransferRow; label: string }[] = [
  { key: "service", label: "서비스" },
  { key: "country", label: "나라" },
  { key: "data", label: "보내는 정보" },
  { key: "when", label: "보내는 때" },
  { key: "purpose", label: "맡기는 일" },
];

// 데스크톱은 표, 휴대폰은 서비스별 카드로 쌓는다 — 다섯 칸 표를 휴대폰 폭에 넣으면 가로로 넘겨야 해서.
function TransferTable({ rows }: { rows: TransferRow[] }) {
  return (
    <>
      <table className="w-full table-fixed border-y text-[12.5px] leading-5 max-sm:hidden">
        <thead>
          <tr className="text-left text-foreground">
            {TRANSFER_COLUMNS.map((column) => (
              <th key={column.key} scope="col" className="py-2 pr-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.service} className="border-t align-top">
              {TRANSFER_COLUMNS.map((column) => (
                <td key={column.key} className={cn("py-2 pr-3", column.key === "service" && "text-foreground")}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.service} className="rounded-lg bg-muted px-3 py-2.5 text-[13px] leading-5">
            <p className="font-medium text-foreground">
              {row.service} <span className="font-normal text-muted-foreground">· {row.country}</span>
            </p>
            <dl className="mt-1.5 grid grid-cols-[72px_1fr] gap-y-1">
              {TRANSFER_COLUMNS.slice(2).map((column) => (
                <div key={column.key} className="contents">
                  <dt>{column.label}</dt>
                  <dd className="text-foreground">{row[column.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
