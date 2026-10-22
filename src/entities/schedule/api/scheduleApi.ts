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

// insert 대신 upsert를 쓴다 — (application_id, stage, round_label) 유니크 제약과
// 맞물려, 앱 쪽 판단이 어떤 이유로든 틀려서 이미 있는 행과 또 같은 조합으로
// 저장을 시도해도 DB가 중복을 만들지 않고 그 행을 고치는 쪽으로 떨어진다.
export async function upsertSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .upsert(
      {
        application_id: input.applicationId,
        stage: input.stage,
        round_label: input.roundLabel ?? null,
        scheduled_at: input.scheduledAt,
      },
      { onConflict: "application_id,stage,round_label" }
    )
    .select()
    .single();

  if (error) throw error;
  return toSchedule(data);
}

export interface UpdateScheduleInput {
  roundLabel?: string | null;
  scheduledAt?: string | null;
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .update({
      ...(input.roundLabel !== undefined ? { round_label: input.roundLabel } : {}),
      ...(input.scheduledAt !== undefined ? { scheduled_at: input.scheduledAt } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toSchedule(data);
}

// 이전 차수로 되돌릴 때, 그 뒤에 쌓인 차수 행들을 지우는 용도.
export async function deleteSchedules(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("schedules").delete().in("id", ids);
  if (error) throw error;
}
