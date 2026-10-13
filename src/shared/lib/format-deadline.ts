export function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  const [, month, day] = deadline.split("-");
  return `마감 ${month}/${day}`;
}
