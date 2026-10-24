import { TUTORIAL_CHAPTERS } from "@/shared/config/tutorial";
import { registerReadyChapters } from "@/shared/lib/tutorial-store";

import { selectReadyChapters } from "./model/ready-chapters";
import { SCENES } from "./ui/scenes";

// 앱이 이 feature를 불러오는 순간(헤더의 튜토리얼 모달) 장면이 있는 챕터를 알려둔다 — 기능 옆 "?" 버튼이
// 이걸 보고 빈 챕터면 숨는다.
registerReadyChapters(selectReadyChapters(TUTORIAL_CHAPTERS, Object.keys(SCENES)).map((c) => c.id));

export { TutorialDialog } from "./ui/tutorial-dialog";
