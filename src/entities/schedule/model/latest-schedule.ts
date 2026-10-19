import type { Schedule } from "./types";

export function latestScheduleByApplication(schedules: Schedule[]): Map<string, Schedule> {
  const map = new Map<string, Schedule>();
  for (const schedule of schedules) {
    const current = map.get(schedule.applicationId);
    if (!current || schedule.createdAt > current.createdAt) {
      map.set(schedule.applicationId, schedule);
    }
  }
  return map;
}
