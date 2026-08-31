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
- 테스트: **Vitest + expect**, API 목킹은 **MSW**로 처리 — Supabase/Gemini API 호출을 MSW로 목킹해 컴포넌트 테스트 진행. 드래그앤드롭 상태 변경, AI 응답 파싱 등 핵심 로직 위주로 작성 (전체 커버리지보다 "왜 이 부분을 테스트했는지" 설명 가능한 게 더 중요)
- 이슈 관리: **Linear** — 개발 태스크를 이슈로 등록해 진행 상황 관리
- Backend: Supabase (DB, Storage)
- AI: Google Gemini API (비전 기능 포함 — 이미지에서 텍스트 추출/분석)
- 웹 검색: Tavily API (무료 티어)
- 배포: Vercel

## 인증 / 유저 모델

- 1차 버전: 로그인 없는 개인용
- 확장 대비: PK는 uuid, 쿼리는 필터링 가능한 구조로 작성, 나중에 `user_id` + RLS 추가 예정

## 핵심 기능 (우선순위 순)

### 1. 칸반보드 (MVP)

- 컬럼: 관심기업 → 지원완료 → 서류합격 → 코딩테스트 → 면접 → 결과
- 카드: 회사명, 직무, 지원일, 마감일, 공고 링크, 메모, 기술스택 태그
- 드래그앤드롭으로 상태 이동

### 2. AI 자동 태깅 (MVP)

- 입력: 채용공고 스크린샷 업로드 (텍스트 복붙 아님 — 원티드/사람인 등 복사 방지로 막히는 경우가 많아서 제외)
- 처리: Gemini 비전으로 이미지에서 회사명·직무·마감일·기술스택 태그 추출 (한 번의 호출로 처리)
- 저장 전 미리보기 화면에서 사용자 확인/수정 필수

### 3. 지원 데이터 통계 (MVP)

- 본인이 지원한 공고 기준 통계 (예: 기술스택 요구 비율 등)

### 4. AI 기업분석 + 예상 면접질문 (2차)

- 트리거: 서류합격 또는 코테합격 후, 사용자가 버튼으로 직접 실행
- 입력: 회사명, 공고 내용, Tavily 검색 결과
- 결과는 저장(재조회 가능), 별도 테이블(`interview_prep`)로 관리

### 5. 프로젝트 매칭 (후순위, 여유 있으면)

- 관심기업 전용 별도 기능, 사용자가 직접 트리거
- 본인 프로젝트(기술스택/주요기능)를 미리 등록해두고 공고와 비교해 어필 포인트 제안
- 결과물은 "매칭된 프로젝트 + 강조 포인트" — 프로젝트 등록 UI 선행 필요해서 가장 나중 구현

## 디자인 방향

- 톤: 가볍고 빠른 개인용 도구 느낌 (무거운 플랫폼 UI 지양)
- 정보 밀도: 칸반 카드는 한눈에 훑을 수 있게 최소 정보만 (회사명, 직무, 태그 1~2개, 마감일)
- 반응형: 모바일에서도 칸반 컬럼 확인 가능해야 함 (가로 스크롤 허용)
- 색상/타이포 등 구체적 톤은 추후 확정 — frontend-design 가이드 참고해서 잡을 것

## 참고: 본인 기존 프로젝트 (프로젝트 매칭 기능용 데이터)

- **런픽**: 러닝 루틴 기록, React/Next.js/TypeScript/Zustand/TanStack Query/Supabase, Gemini API 연동, 낙관적 업데이트·무한스크롤·동시성 제어 경험
- **드림카드**: 모바일 청첩장 제작(dream-card.co.kr), React-hook-form/Framer Motion/Supabase Storage, 실시간 미리보기·이미지 업로드·PDF 다운로드 경험

## velog devlog 작성 규칙

- devlog에는 기획 배경/의사결정 서사, **기술스택 선정 이유, 기능 설명, 트러블슈팅** 등의 내용이 담길 것.
- 개발 중 기능을 고민하거나 구현할 때마다, **먼저 블로그 md로 정리할지 나한테 직접 물어볼 것**. 임의로 작성하지 말 것.

## 작업 시 유의사항

- 기능/설계가 바뀌면 이 문서도 함께 업데이트
- 기획 배경이나 의사결정 과정 같은 서사는 이 문서가 아니라 velog devlog 쪽에 남길 것 — 여기는 "지금 뭘 만들어야 하는지"만 간결하게 유지
- 커뮤니케이션 톤: 상사 대하듯 존댓말과 격식을 갖춰서 소통할 것.
- **git 커밋 전에는 반드시 커밋 메시지를 먼저 제안하고, 동의를 받은 뒤에만 커밋을 실행할 것.** 임의로 커밋하지 말 것.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
