// 보드 밖(공고 추가 모달 등)에서 "이 카드 열기"를 요청한다 — 이미 추가한 공고를 다시 넣으려 할 때 그 카드로 보내려고.
// 보드(kanban-board)가 구독해서 상세 모달을 연다. 여러 feature·widget에 걸쳐 있어 shared에 둔다.
type Listener = (applicationId: string) => void;

let listener: Listener | null = null;

export function registerApplicationOpener(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

export function requestOpenApplication(applicationId: string) {
  listener?.(applicationId);
}
