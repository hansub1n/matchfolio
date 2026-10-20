# AGENT.md

matchfolio 프로젝트 작업 시 참고할 컨텍스트 문서.

## 프로젝트 개요

취업 지원 현황을 칸반보드로 관리하는 개인 포트폴리오 프로젝트. 채용공고 스크린샷을 업로드하면 AI가 자동으로 카드를 생성해주는 게 핵심.

- 대상: 프론트엔드 신입 취업 준비생 (본인)
- 개발 기간: 3~7일
- 핵심 원칙: **입력이 귀찮으면 아무도 안 쓴다** — 모든 기능은 이 원칙을 기준으로 판단할 것

## 기술 스택

- Frontend: TypeScript, React, Next.js, Tailwind CSS
- UI 컴포넌트: **shadcn/ui** — 채용 공고에서 자주 요구되는 스택이라 채택. npm 설치가 아니라 코드를 프로젝트에 복사하는 방식이므로, 각 컴포넌트를 그대로 쓰지 말고 커스터마이징하며 동작 원리를 이해할 것
- 아키텍처: **FSD (Feature-Sliced Design)** — 폴더 구조를 app/pages/widgets/features/entities/shared 레이어로 구성. 처음 도입이라 레이어 개념(entities, features, widgets 구분 기준)을 문서로 먼저 정리한 뒤 적용할 것
- 테스트: **Vitest + expect**, API 목킹은 **MSW**로 처리 — Supabase/Groq API 호출을 MSW로 목킹해 컴포넌트 테스트 진행. 드래그앤드롭 상태 변경, AI 응답 파싱 등 핵심 로직 위주로 작성 (전체 커버리지보다 "왜 이 부분을 테스트했는지" 설명 가능한 게 더 중요)
- 이슈 관리: **Linear** — 개발 태스크를 이슈로 등록해 진행 상황 관리
- Backend: Supabase (DB, Storage)
- AI: 텍스트 전용 라우트는 Groq API(gpt-oss-120b). 스크린샷 비전 추출은 Gemini를 1순위로 쓰고, 실패하면 Groq(Qwen3.8-27B 비전)로 자동 폴백
- 웹 검색: Tavily API (무료 티어)
- 배포: Vercel

## 인증 / 유저 모델

- 1차 버전: 로그인 없는 개인용
- 확장 대비: PK는 uuid, 쿼리는 필터링 가능한 구조로 작성, 나중에 `user_id` + RLS 추가 예정

## 핵심 기능 (우선순위 순)

### 1. 칸반보드 (MVP)

- 컬럼(관심기업은 별도 탭): 서류 → 코딩테스트 → 면접 → 종료
- 서류합격은 컬럼이 아니라 서류에서 다음 컬럼으로 드래그하는 이동 그 자체. 코테가 없는 회사는 서류에서 면접으로 바로 드래그.
- 카드는 전형 단계(`stage`)와 결과(`outcome`: 진행중/합격/불합격)를 따로 가짐 — 종료 컬럼으로 옮기면 합격/불합격을 고르고, 탈락한 단계가 `stage`에 그대로 남아 단계별 통과율 집계에 쓰인다.
- 면접 차수(1차/2차/…)와 일정은 `schedules` 테이블에 별도로 쌓인다. 차수마다 한 행이라 이전 차수 기록이 남는다.
- 카드: 회사명, 직무, 지원일, 마감일, 공고 링크, 메모, 기술스택 태그. 마감일은 D-day 기준으로 색이 바뀜(`shared/lib/dday.ts`, 캘린더 탭과 동일 규칙)
- 드래그앤드롭으로 단계 이동

### 2. AI 자동 태깅 (MVP)

- 입력: 채용공고 스크린샷 업로드 (텍스트 복붙 아님 — 원티드/사람인 등 복사 방지로 막히는 경우가 많아서 제외)
- 처리: Gemini 비전으로 이미지에서 회사명·직무·마감일·기술스택 태그 추출 (한 번의 호출로 처리), 실패 시 Groq(Qwen) 비전으로 자동 폴백
- 저장 전 미리보기 화면에서 사용자 확인/수정 필수

### 3. 지원 데이터 통계 (MVP) — 구현 완료

- 본인이 지원한 공고 기준 통계 (예: 기술스택 요구 비율 등)
- 지원 잔디: 올해 1/1~12/31 고정 그리드(월요일 시작), 연도 선택 가능(지원 기록 있는 과거 연도만). 지난 빈 칸/미래 칸 모두 `--heat-0`(순수 회색)

### 4. AI 기업분석 + 예상 면접질문 (2차)

- 트리거: 코딩테스트 또는 면접 단계(outcome이 진행중일 때)부터, 사용자가 버튼으로 직접 실행
- 입력: 회사명, 공고 내용, Tavily 검색 결과
- 결과는 저장(재조회 가능), 별도 테이블(`interview_prep`)로 관리

### 5. 프로젝트 매칭 (후순위) — 구현 완료

- "내 프로젝트" 탭에서 본인 프로젝트(이름/기술스택/주요기능)를 등록. 수동 입력, GitHub 저장소 URL(README 자동 추출), 또는 README·devlog 등 텍스트 붙여넣기 중 선택
- 관심기업 카드 전용 "프로젝트 매칭" 버튼 — 등록된 프로젝트 전부에 대해 공고 대비 적합도(fitScore 0~100) + 강조 포인트 생성
- 모든 프로젝트를 무조건 긍정적으로 평가하지 않도록, 공고에 명시된 요구사항과 겹치는 부분만 근거로 보수적으로 채점하게 프롬프트에 명시
- 결과는 `project_matches` 테이블에 캐싱 (카드 열 때마다 재호출 안 함, "다시 매칭"으로만 재생성)

### 6. 관심기업 → 지원카드 전환

- 관심기업 카드의 "지원하기" 버튼 → 회사명/직무/기술스택/공고 정보가 그대로 채워진 지원카드 추가 다이얼로그가 열림 (재입력 불필요, 저장 전 수정 가능)
- 생성 완료 시 원래 관심기업 항목은 삭제됨

### 7. 캘린더 탭 — 구현 완료

- 데스크톱: 월 단위 캘린더(월요일 시작) + 오른쪽 "다가오는 일정" 패널. 모바일: 패널만(그리드 숨김)
- 표시 대상: 서류 전형 중(stage=document & outcome=in_progress)인 지원 카드의 마감일 + 관심기업 마감일 + `schedules.scheduled_at`(코딩테스트/면접) 일정. 면접/코테로 넘어간 카드의 서류 마감일은 더 이상 표시하지 않음
- D-day 색 규칙(보드 카드 마감일 표시와 동일 기준, `shared/lib/dday.ts`): 당일·D-1은 `--urgent`, D-2~3은 `--highlight`, 그 외/지난 일정은 중립색
- 일정 미정(차수는 있는데 시간 미입력) 항목은 패널 하단에 따로 모아서 "날짜 입력" 버튼으로 바로 입력 가능
- 이벤트 클릭 시 지원카드/관심기업 상세 다이얼로그 재사용

## 디자인 방향

- 톤: 가볍고 빠른 개인용 도구 느낌 (무거운 플랫폼 UI 지양)
- 정보 밀도: 칸반 카드는 한눈에 훑을 수 있게 최소 정보만 (회사명, 직무, 태그 3~4개, 마감일)
- 반응형: 모바일에서도 칸반 컬럼 확인 가능해야 함 (가로 스크롤 허용)
- 색상/타이포 등 구체적 톤은 추후 확정 — frontend-design 가이드 참고해서 잡을 것
- 카피 톤: 사실만 담담하게, 권유/재촉 금지
- 강조는 테두리 대신 색/굵기로

## 참고: 본인 기존 프로젝트 (프로젝트 매칭 기능용 데이터)

- **런픽**: 러닝 루틴 기록, React/Next.js/TypeScript/Zustand/TanStack Query/Supabase, Gemini API 연동, 낙관적 업데이트·무한스크롤·동시성 제어 경험
- **드림카드**: 모바일 청첩장 제작(dream-card.co.kr), React-hook-form/Framer Motion/Supabase Storage, 실시간 미리보기·이미지 업로드·PDF 다운로드 경험

## velog devlog 작성 규칙

- devlog에는 기획 배경/의사결정 서사, **기술스택 선정 이유, 기능 설명, 트러블슈팅** 등의 내용이 담길 것.
- 개발 중 기능을 고민하거나 구현할 때마다, **먼저 블로그 md로 정리할지 나한테 직접 물어볼 것**. 임의로 작성하지 말 것.
- 수동적으로 기다리지 말고, 기능 하나가 마무리되는 시점(커밋 전후)마다 쓸만한 소재가 쌓였는지 **틈틈이 먼저 체크인할 것**.
- `devlog/`는 git에 커밋하지 않음 (`.gitignore` 처리됨) — velog에 직접 옮겨서 관리.

## 작업 시 유의사항

- 기능/설계가 바뀌면 이 문서도 함께 업데이트
- 기획 배경이나 의사결정 과정 같은 서사는 이 문서가 아니라 velog devlog 쪽에 남길 것 — 여기는 "지금 뭘 만들어야 하는지"만 간결하게 유지
- 커뮤니케이션 톤: 상사 대하듯 존댓말과 격식을 갖춰서 소통할 것.
- 의사결정이 필요한 선택지는 옵션만 나열하지 말고, 먼저 생각해서 추천과 근거를 제시할 것.
- **git 커밋 전에는 반드시 커밋 메시지를 먼저 제안하고, 동의를 받은 뒤에만 커밋을 실행할 것.** 임의로 커밋하지 말 것. 변경사항이 여러 기능/수정에 걸쳐 쌓였으면 하나로 묶지 말고 논리 단위로 나눠서, 나눈 커밋 메시지들을 전부 먼저 보여주고 동의를 받은 뒤에 실행할 것 — 쪼개기로 한 것 자체가 임의 실행의 면죄부가 되지 않는다.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
