// 사용법 튜토리얼의 챕터/장면 정의. 장면을 추가하려면 여기 한 줄을 넣고, 움직이는 미니 UI는
// features/onboarding/ui/scenes의 SCENES에 같은 id로 등록한다(등록 안 된 장면은 "준비 중"으로 보인다).
// shared는 features를 참조할 수 없어서 컴포넌트 대신 장면 id로 연결한다.
export type TutorialChapterId =
  | "basics"
  | "add-posting"
  | "schedule"
  | "projects"
  | "early-ai"
  | "interview"
  | "records";

export interface TutorialScene {
  id: string;
  title: string;
  caption: string;
}

export interface TutorialChapter {
  id: TutorialChapterId;
  title: string;
  scenes: TutorialScene[];
}

export const BASICS_CHAPTER_ID: TutorialChapterId = "basics";

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: "basics",
    title: "기본 흐름",
    scenes: [
      { id: "basics.upload", title: "공고를 올려요", caption: "스크린샷을 끌어다 놓으면 AI가 읽어서 관심 카드로 만들어요" },
      { id: "basics.apply", title: "지원하면 옮겨요", caption: "지원을 마치면 서류로 옮겨요. 지원 기록이 쌓여요" },
      { id: "basics.progress", title: "결과에 따라 옮겨요", caption: "통과하면 다음 단계로, 끝나면 종료로 옮겨요" },
      { id: "basics.ai", title: "AI가 준비를 도와요", caption: "카드를 열면 회사 분석, 공고 매칭, 예상 질문을 볼 수 있어요" },
      { id: "basics.flow", title: "흐름이 보여요", caption: "기록이 쌓이면 어디서 통과하고 떨어지는지 보여줘요" },
    ],
  },
  {
    id: "add-posting",
    title: "공고 추가",
    scenes: [
      { id: "add-posting.ways", title: "세 가지 방법", caption: "끌어다 놓거나, 붙여넣거나, 버튼으로 올릴 수 있어요" },
      { id: "add-posting.review", title: "AI가 읽은 내용 확인", caption: "AI가 틀릴 수 있어요. '확인 필요' 칸은 꼭 확인해주세요" },
      { id: "add-posting.status", title: "관심 또는 지원 완료", caption: "아직 지원 전이면 관심, 이미 지원했다면 지원 완료로 저장해요" },
    ],
  },
  {
    id: "schedule",
    title: "일정과 단계",
    scenes: [
      { id: "schedule.add", title: "일정 넣기", caption: "코딩테스트나 면접으로 옮기면 일정을 넣을 수 있어요. 나중에 넣어도 돼요" },
      { id: "schedule.round", title: "면접 차수", caption: "다음 차수로 넘어가면 차수를 고르고 날짜를 넣어요" },
      { id: "schedule.revert", title: "잘못 눌렀을 때", caption: "앞 차수를 고르면 되돌릴 수 있어요" },
      { id: "schedule.result", title: "결과 기록", caption: "종료로 옮기면 결과를 남겨요. 어느 단계에서 끝났는지 기록돼요" },
    ],
  },
  {
    id: "projects",
    title: "내 자료",
    scenes: [
      { id: "projects.register", title: "자료 등록", caption: "이력서·자소서를 붙여넣고, 프로젝트는 GitHub 주소로 불러와요. 자소서는 대표를 정할 수 있어요" },
      { id: "projects.usage", title: "어디에 쓰이나요", caption: "등록한 자료로 공고마다 자소서 첨삭과 어필할 프로젝트를 보여주고, 예상 질문을 만들어요" },
    ],
  },
  {
    id: "early-ai",
    title: "관심·서류 단계의 AI",
    scenes: [
      { id: "early-ai.company", title: "회사 분석", caption: "회사가 하는 일과 최근 소식을 출처와 함께 정리해요" },
      { id: "early-ai.match", title: "공고 매칭", caption: "내 자료를 이 공고에 맞춰 자소서 첨삭, 지원 동기, 이력서 강조점, 어필할 프로젝트를 보여줘요" },
      { id: "early-ai.motivation", title: "지원 동기 포인트", caption: "공고 매칭에서 회사 사업과 내 경험을 이은 지원 동기 문장을 만들어요" },
    ],
  },
  {
    id: "interview",
    title: "면접 준비",
    scenes: [
      { id: "interview.questions", title: "예상 질문", caption: "공고 기반 질문에 내 프로젝트 기반 질문이 더해져요. 약한 부분도 알려줘요" },
      { id: "interview.hints", title: "답변 힌트와 역질문", caption: "왜 묻는지와 답변 힌트, 면접관에게 할 질문까지 준비해요" },
    ],
  },
  {
    id: "records",
    title: "기록 보기",
    scenes: [
      { id: "records.calendar", title: "캘린더", caption: "마감일과 일정이 한곳에 모여요" },
      { id: "records.stats", title: "통계", caption: "어느 단계에서 통과하고 떨어지는지 보여줘요" },
      { id: "records.heatmap", title: "잔디와 기술 격차", caption: "꾸준히 지원한 기록과, 공고에서 자주 나오는데 나한테 없는 기술을 보여줘요" },
    ],
  },
];
