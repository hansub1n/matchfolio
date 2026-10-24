// 상세 모달 안의 "내 자료에서 등록하기"처럼 화면 깊은 곳에서 탭을 바꿔야 할 때 쓴다. 탭 상태는
// home-view가 들고 있고 여기 등록한 핸들러로만 바꾼다. 탭이 바뀌면 보드가 언마운트되면서 열려
// 있던 모달도 같이 닫힌다.
export type HomeTab = "board" | "materials" | "stats" | "calendar";

let handler: ((tab: HomeTab) => void) | null = null;

export function registerTabHandler(next: (tab: HomeTab) => void) {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function requestTab(tab: HomeTab) {
  handler?.(tab);
}
