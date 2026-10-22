import { useMemo } from "react";

// 추출 중 화면에 로컬 파일 미리보기를 보여주기 위한 임시 URL.
export function useObjectUrl(file: File | null): string | null {
  return useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
}
