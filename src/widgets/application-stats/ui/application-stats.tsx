import type { Application } from "@/entities/application";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { computeApplicationStats } from "../model/compute-stats";
import { StatusDistribution } from "./status-distribution";
import { TechStackDonut } from "./tech-stack-donut";

export function ApplicationStats({ applications }: { applications: Application[] }) {
  const stats = computeApplicationStats(applications);

  if (stats.total === 0) {
    return (
      <p className="px-4 text-sm text-muted-foreground">
        아직 지원 데이터가 없습니다. 카드를 추가하면 통계가 표시됩니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <Card size="sm">
        <CardContent className="flex items-end gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">총 지원</span>
            <span className="text-5xl font-semibold">{stats.total}</span>
          </div>
          <div className="flex gap-6 pb-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">합격률</span>
              <span className="text-lg font-semibold">
                {stats.passRate === null ? "—" : `${stats.passRate}%`}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">합격</span>
              <span className="text-lg font-semibold">{stats.passedCount}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">불합격</span>
              <span className="text-lg font-semibold">{stats.failedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>상태별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusDistribution statusCounts={stats.statusCounts} total={stats.total} />
        </CardContent>
      </Card>

      {stats.techStackCounts.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>기술스택 요구 빈도</CardTitle>
          </CardHeader>
          <CardContent>
            <TechStackDonut techStackCounts={stats.techStackCounts} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
