/**
 * 3단계: 요약이 없는 기사(summary IS NULL)를 Supabase에서 가져와
 * Gemini API로 3줄 요약 + 카테고리(정부 지원사업/대학 사례/기술 동향/기타)를 생성하고
 * 다시 Supabase에 업데이트한다.
 *
 * 실제 처리 로직(기사 사이 페이싱, 재시도, DB 업데이트)은
 * lib/summarize/processPendingArticles.ts에 있다 (scripts/run-pipeline.ts와 공유).
 *
 * 실행 방법:
 *   .env에 SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY 설정 (.env.example 참고)
 *   npm install
 *   npm run summarize
 */

import "dotenv/config";
import { summarizePendingArticles } from "../lib/summarize/processPendingArticles";

/** 한 번 실행할 때 처리할 최대 기사 수 (환경 변수로 조정 가능) */
const BATCH_LIMIT = Number(process.env.SUMMARIZE_BATCH_LIMIT ?? 20);

async function main(): Promise<void> {
  const result = await summarizePendingArticles(BATCH_LIMIT);

  if (result.targetCount === 0) {
    console.error("[summarize] 처리할 기사가 없습니다.");
  }
}

main().catch((error) => {
  console.error("[error] 스크립트 실행 중 오류가 발생했습니다:", error);
  process.exitCode = 1;
});
