import { APPLICATION_STATUSES, type Application } from "@/entities/application";

export interface ApplicationStats {
  total: number;
  statusCounts: { label: string; count: number }[];
  passedCount: number;
  failedCount: number;
  passRate: number | null;
  techStackCounts: { tech: string; count: number }[];
}

export function computeApplicationStats(applications: Application[]): ApplicationStats {
  const statusCounts = APPLICATION_STATUSES.map((status) => ({
    label: status.label,
    count: applications.filter((app) => app.status === status.value).length,
  }));

  const passedCount = applications.filter((app) => app.result === "passed").length;
  const failedCount = applications.filter((app) => app.result === "failed").length;
  const passRate =
    passedCount + failedCount > 0
      ? Math.round((passedCount / (passedCount + failedCount)) * 100)
      : null;

  const techTally = new Map<string, number>();
  for (const app of applications) {
    for (const tech of app.techStack) {
      techTally.set(tech, (techTally.get(tech) ?? 0) + 1);
    }
  }
  const techStackCounts = [...techTally.entries()]
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: applications.length,
    statusCounts,
    passedCount,
    failedCount,
    passRate,
    techStackCounts,
  };
}
