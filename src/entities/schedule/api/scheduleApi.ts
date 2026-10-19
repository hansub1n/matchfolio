import { supabase } from "@/shared/api/supabase";

import type { Schedule, ScheduleStage } from "../model/types";

interface ScheduleRow {
  id: string;
  application_id: string;
  stage: ScheduleStage;
  round_label: string | null;
  scheduled_at: string | null;
  created_at: string;
}

function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    applicationId: row.application_id,
    stage: row.stage,
    roundLabel: row.round_label,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
  };
}

// 개인용 도구라 일정 전체를 한 번에 불러와서(테이블이 크지 않음), 호출하는 쪽에서
// application별 최신 일정을 계산해 쓴다.
export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toSchedule);
}

export interface CreateScheduleInput {
  applicationId: string;
  stage: ScheduleStage;
  roundLabel?: string | null;
  scheduledAt?: string | null;
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      application_id: input.applicationId,
      stage: input.stage,
      round_label: input.roundLabel,
      scheduled_at: input.scheduledAt,
    })
    .select()
    .single();

  if (error) throw error;
  return toSchedule(data);
}
