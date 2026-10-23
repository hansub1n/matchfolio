// 버킷 루트에 있는 기존 스크린샷을 {user_id}/ 폴더로 옮기고, applications.screenshot_paths도
// 새 경로로 바꾼다(012_storage_user_folders.sql 이후 한 번만 실행).
// 어느 카드에도 연결되지 않은 파일(테스트하며 올린 것 등)은 옮기지 않고 목록만 보여준다.
//
// 사용법 (프로젝트 루트에서, .env.local의 service role 키를 읽는다):
//   node supabase/scripts/move-screenshots-to-user-folder.mjs <user_id>            # 미리보기
//   node supabase/scripts/move-screenshots-to-user-folder.mjs <user_id> --apply    # 실제 실행
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "job-posting-screenshots";
const [userId, flag] = process.argv.slice(2);
const apply = flag === "--apply";

if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error("user_id(uuid)를 첫 인자로 넘겨주세요.");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: apps, error: appsError } = await supabase
  .from("applications")
  .select("id, company, screenshot_paths");
if (appsError) throw appsError;

// 이미 폴더 안에 있는 경로("/" 포함)는 건너뛴다 — 여러 번 실행해도 안전하다.
const moves = new Map();
for (const app of apps) {
  for (const path of app.screenshot_paths ?? []) {
    if (!path.includes("/")) moves.set(path, `${userId}/${path}`);
  }
}

const { data: rootObjects, error: listError } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
if (listError) throw listError;
const orphans = rootObjects.filter((o) => o.id && !moves.has(o.name)).map((o) => o.name);

console.log(`옮길 파일 ${moves.size}개 (카드에 연결된 것)`);
for (const [from, to] of moves) console.log(`  ${from} -> ${to}`);
console.log(`카드에 연결되지 않은 루트 파일 ${orphans.length}개 (옮기지 않음)`);
for (const name of orphans) console.log(`  ${name}`);

if (!apply) {
  console.log("\n미리보기만 했습니다. 실제로 옮기려면 --apply를 붙여 다시 실행하세요.");
  process.exit(0);
}

for (const [from, to] of moves) {
  const { error } = await supabase.storage.from(BUCKET).move(from, to);
  if (error) console.error(`이동 실패 ${from}: ${error.message}`);
}

for (const app of apps) {
  const paths = app.screenshot_paths ?? [];
  if (!paths.some((p) => moves.has(p))) continue;
  const { error } = await supabase
    .from("applications")
    .update({ screenshot_paths: paths.map((p) => moves.get(p) ?? p) })
    .eq("id", app.id);
  if (error) console.error(`경로 갱신 실패 ${app.company}: ${error.message}`);
}

console.log("\n완료했습니다.");
