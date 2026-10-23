// 프로젝트 기반 질문은 프로젝트가 바뀌어도 자동으로 다시 만들지 않는다 —
// 대신 마지막 생성 이후 "새로 등록된" 프로젝트가 있으면 그 사실만 알려주고,
// 갱신은 "다시 만들기"를 눌렀을 때만 한다. my_projects에 updated_at이 없어서
// "새로 등록"은 감지해도 "기존 프로젝트 수정"까지는 감지하지 못한다.
export function hasNewerProjectSinceGeneration(
  myProjects: { createdAt: string }[],
  projectQuestionsUpdatedAt: string | null
): boolean {
  if (!projectQuestionsUpdatedAt) return false;
  const generatedAt = new Date(projectQuestionsUpdatedAt).getTime();
  return myProjects.some((p) => new Date(p.createdAt).getTime() > generatedAt);
}
