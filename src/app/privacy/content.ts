// 개인정보처리방침 문구 — 페이지(page.tsx)는 이걸 그리기만 한다. 수집 항목·외부 서비스·보관 기간이 바뀌면
// 여기만 고치고 적용일(EFFECTIVE_DATE)을 바꾼다. 문구와 실제 동작(계정 지우기, 1년 미접속 정리, 의견 3년 보관)이
// 어긋나지 않게 할 것.

export const EFFECTIVE_DATE = "2026년 10월 30일부터 적용";

// 한 줄 소개 — highlight 부분만 형광펜 밑줄.
export const INTRO = {
  before: "matchfolio는 ",
  highlight: "이름도, 전화번호도 묻지 않아요.",
  after: " 지원 현황 보드를 보여주는 데 필요한 것만 저장해요.",
};

export interface SummaryCard {
  title: string;
  items: string[];
  // "하지 않는 것" 칸 — 반전 색, 항목 앞 ✕.
  negative?: boolean;
}

export const SUMMARY: SummaryCard[] = [
  {
    title: "저장하는 것",
    items: [
      "내가 넣은 공고, 스크린샷, 면접 일정",
      "내 자료(프로젝트, 자소서, 이력서)",
      "AI가 만든 분석 결과",
      "GitHub 연결 시 아이디, 프로필 사진, 이메일",
    ],
  },
  {
    title: "하지 않는 것",
    negative: true,
    items: [
      "이름, 전화번호 수집",
      "광고나 마케팅에 사용",
      "다른 사람에게 판매하거나 공유",
      "사용 기록에 입력 내용 담기",
    ],
  },
  {
    title: "잠깐 보내는 곳",
    items: [
      "Google Gemini: 스크린샷 읽기",
      "Groq: 링크로 넣은 공고 읽기, 회사 분석, 예상 질문 만들기",
      "Tavily: 회사명으로 검색",
    ],
  },
  {
    title: "지우는 법",
    items: [
      "카드를 지우면 관련 기록도 함께 지워져요",
      "계정 메뉴에서 모든 기록을 바로 지울 수 있어요",
      "1년 동안 들어오지 않으면 자동으로 지워져요",
    ],
  },
];

export interface TransferRow {
  service: string;
  country: string;
  data: string;
  when: string;
  purpose: string;
}

// 문단 사이 섞이는 블록 — 문단, 목록(하위 목록 가능), 해외 이전 표.
export type DetailBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: (string | { text: string; children: string[] })[] }
  | { type: "transfers"; rows: TransferRow[] };

export interface DetailSection {
  id: string;
  title: string;
  blocks: DetailBlock[];
}

export const DETAILS: DetailSection[] = [
  {
    id: "collect",
    title: "모으는 정보와 쓰는 곳",
    blocks: [
      {
        type: "list",
        items: [
          "계정: 처음 들어오면 회원가입 없이 익명 계정이 자동으로 만들어져요. GitHub를 연결하면 GitHub 아이디, 프로필 사진, 이메일이 함께 저장돼요. 다른 기기에서 같은 보드를 여는 데 써요.",
          "직접 넣은 내용: 공고(회사명, 직무, 마감일, 기술스택, 메모 등)와 공고 스크린샷, 링크로 넣은 공고 주소, 내 자료(프로젝트, 자소서, 이력서), 면접 일정, AI가 만든 회사 분석, 공고 매칭, 예상 질문 결과. 보드, 캘린더, 통계, 공고 매칭 기능을 보여주는 데만 써요.",
          "의견 보내기: 의견 내용, 직접 적은 경우의 연락처(선택), 보낸 화면 위치, 브라우저 정보. 답변하고 불편한 점을 고치는 데 써요.",
          '익명 사용 기록: 방문 수와 "카드를 만들었다", "공고 읽기에 실패했다" 같은 기록. 무슨 일이 있었는지만 담고 회사명이나 공고 내용 같은 입력 내용은 담지 않아요. 기능을 개선하는 데 써요.',
          "만 14세 미만 아동의 정보는 받지 않아요.",
        ],
      },
    ],
  },
  {
    id: "transfers",
    title: "함께 처리하는 서비스와 해외 이전",
    blocks: [
      {
        type: "paragraph",
        text: "matchfolio는 아래 서비스에 처리를 맡기고 있어요. 이 중 일부는 해외에 있는 서버로 정보가 전송돼요. 전송은 기능을 쓸 때 인터넷(암호화된 HTTPS)으로 이루어져요.",
      },
      {
        type: "transfers",
        rows: [
          {
            service: "Supabase",
            country: "한국 서울",
            data: "계정, 입력한 내용, 스크린샷",
            when: "저장할 때",
            purpose: "데이터 저장",
          },
          {
            service: "Vercel",
            country: "미국",
            data: "접속 기록, 익명 사용 기록",
            when: "사이트를 쓸 때",
            purpose: "사이트 운영, 방문 통계",
          },
          {
            service: "Google (Gemini)",
            country: "미국",
            data: "공고 스크린샷",
            when: "스크린샷으로 공고를 추가할 때",
            purpose: "스크린샷에서 공고 내용 읽기",
          },
          {
            service: "Groq",
            country: "미국",
            data: "공고 내용, 내 자료, 검색 결과, 링크로 받아온 공고 본문",
            when: "링크로 공고를 추가할 때, 회사 분석, 공고 매칭, 예상 질문을 만들 때",
            purpose: "분석 글 생성",
          },
          {
            service: "Tavily",
            country: "미국",
            data: "회사명",
            when: "회사 분석을 할 때",
            purpose: "웹 검색",
          },
          {
            service: "Cloudflare (Turnstile)",
            country: "미국",
            data: "IP 주소, 브라우저 정보",
            when: "처음 들어올 때",
            purpose: "자동 계정 생성 방지",
          },
        ],
      },
      {
        type: "paragraph",
        text: "각 서비스에 보낸 정보는 그 회사의 보관 기간과 이용 조건에 따라 처리된 뒤 지워져요. 특히 Google Gemini 무료 이용 조건에서는 보낸 스크린샷이 Google의 서비스 개선에 쓰일 수 있어요. 주민등록번호, 연락처처럼 민감한 개인정보가 보이는 스크린샷이나 자료는 올리지 말아주세요.",
      },
      {
        type: "paragraph",
        text: "링크로 공고를 넣으면 matchfolio 서버가 그 공고 페이지(원티드, 리멤버, 점핏)를 한 번 받아와 읽어요. 받아온 페이지는 저장하지 않고, 공고 주소만 카드에 남겨요.",
      },
      {
        type: "paragraph",
        text: "해외 전송을 원하지 않으면 AI 기능을 쓰지 않고 직접 입력해서 쓸 수 있어요. 이 경우 Google, Groq, Tavily로는 아무것도 보내지 않아요.",
      },
    ],
  },
  {
    id: "retention",
    title: "보관 기간과 삭제",
    blocks: [
      {
        type: "list",
        items: [
          "공고나 자료를 지우면 함께 저장된 스크린샷과 AI 결과도 바로 지워져요.",
          '계정 메뉴의 "계정과 모든 기록 지우기"를 누르면 계정과 모든 데이터가 바로 지워지고 되돌릴 수 없어요.',
          "마지막으로 들어온 날부터 1년이 지난 계정은 모든 기록과 함께 자동으로 지워요.",
          "의견은 받은 날부터 3년 보관해요. 계정을 지우면 의견에서 계정 정보와 연락처를 지워서 누가 보냈는지 알 수 없게 해요.",
          "지운 데이터는 복구할 수 없는 방법으로 삭제해요.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "쿠키와 자동으로 남는 정보",
    blocks: [
      {
        type: "list",
        items: [
          "쿠키는 로그인 상태를 유지하는 데만 써요. 브라우저 설정에서 막을 수 있지만, 그러면 내 보드에 다시 들어올 수 없어요.",
          '기본적으로 브라우저를 닫으면 로그인이 끝나요. 계정 메뉴에서 "로그인 유지"를 켠 경우에만 오래 유지돼요.',
          "방문 통계는 쿠키 없이 익명으로 세요.",
          "사이트 운영과 보안을 위해 IP 주소, 접속 시각, 브라우저 정보가 서버 기록에 자동으로 남고, 각 서비스의 보관 기간이 지나면 지워져요.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "안전하게 지키는 방법",
    blocks: [
      {
        type: "list",
        items: [
          "행 단위 보안(RLS)으로 내 데이터는 내 계정에서만 읽고 쓸 수 있어요.",
          "모든 통신은 HTTPS로 암호화돼요.",
          "AI 서비스 키는 서버에만 두고 브라우저로 보내지 않아요.",
          "자동으로 계정을 만들어 기능을 남용하지 못하게 사람 확인(Turnstile)과 하루 사용 한도를 둬요.",
        ],
      },
    ],
  },
  {
    id: "rights",
    title: "내 권리와 문의",
    blocks: [
      {
        type: "list",
        items: [
          "언제든 내 정보를 보거나, 고치거나, 지우거나, 처리를 멈춰달라고 요청할 수 있어요. 대부분은 앱에서 바로 할 수 있고, 안 되는 건 아래로 연락해주세요. 10일 안에 답변드려요.",
          "개인정보 보호책임자: matchfolio 운영팀 · 02dassssh@gmail.com",
          {
            text: "도움이 더 필요하면 아래 기관에 문의할 수 있어요.",
            children: [
              "개인정보침해신고센터: privacy.kisa.or.kr, 국번 없이 118",
              "개인정보분쟁조정위원회: kopico.go.kr, 1833-6972",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "changes",
    title: "방침이 바뀔 때",
    blocks: [
      {
        type: "paragraph",
        text: "내용이 바뀌면 적용하기 7일 전에 사이트에 알리고, 이 페이지의 적용일을 바꿔요. 이전 버전은 요청하면 보내드려요.",
      },
    ],
  },
];

export const DELETE_ROW = {
  text: "내 계정과 모든 기록을 지금 지우기",
};
