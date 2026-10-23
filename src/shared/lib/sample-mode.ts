import { showToast } from "@/shared/ui/toast";

// "예시 데이터로 보기"가 켜져 있으면 화면은 샘플 데이터로 그리고, 저장/AI 호출은 막는다.
// 버튼 핸들러(blockInSampleMode)와 API 함수(assertNotSampleMode) 두 군데서 막는다 —
// 핸들러에서 놓친 경로가 있어도 DB에는 절대 쓰지 않게.
export const SAMPLE_MODE_MESSAGE = "예시를 끄고 직접 추가해보세요";

let active = false;

export function setSampleModeActive(value: boolean) {
  active = value;
}

export function blockInSampleMode(): boolean {
  if (!active) return false;
  showToast(SAMPLE_MODE_MESSAGE);
  return true;
}

export function assertNotSampleMode() {
  if (blockInSampleMode()) throw new Error(SAMPLE_MODE_MESSAGE);
}
