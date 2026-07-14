/**
 * 요약이 없는 기사를 가져와 Gemini로 요약/분류하고 DB에 반영하는 오케스트레이션 로직.
 * scripts/summarize-articles.ts, scripts/run-pipeline.ts에서 공통으로 사용한다.
 *
 * Gemini 무료 티어는 모델별로 분당 요청 수(RPM) 제한이 있다
 * (예: gemini-2.5-flash 무료 티어는 분당 5회). 기사를 쉬지 않고 연달아 처리하면
 * 금방 한도를 넘기고 재시도도 계속 실패하므로, 기사 사이에 최소 간격을 두어
 * 애초에 한도를 넘지 않도록 페이싱한다.
 */

import { getArticlesPendingSummary, updateArticleSummary } from "../db/articles";
import { summarizeArticle } from "./summarizeArticle";

/**
 * 기사 처리 사이 최소 간격(ms). 환경 변수로 조정 가능.
 * gemini-2.5-flash 무료 티어 RPM=5 기준 이론상 한계는 12초 간격이라, 여유를 두고 13초로 설정한다.
 * 사용 중인 모델의 무료 티어 RPM이 다르면 GEMINI_MIN_INTERVAL_MS로 조정한다.
 */
const MIN_INTERVAL_MS = Number(process.env.GEMINI_MIN_INTERVAL_MS ?? 13000);

export interface SummarizePendingResult {
  targetCount: number;
  successCount: number;
  failureCount: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 요약이 없는 기사를 최대 `limit`건 가져와 순서대로 요약/분류하고 DB에 저장한다.
 * 기사 하나가 (재시도까지) 최종 실패해도 나머지 기사 처리는 계속한다.
 */
export async function summarizePendingArticles(limit: number): Promise<SummarizePendingResult> {
  console.error(`[summarize] 요약이 없는 기사를 최대 ${limit}건 조회하는 중...`);
  const pending = await getArticlesPendingSummary(limit);
  console.error(`[summarize] 대상 기사 수: ${pending.length}`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const article = pending[i];

    if (i > 0) {
      // 무료 티어 분당 요청 한도를 넘지 않도록 기사 사이에 간격을 둔다.
      await sleep(MIN_INTERVAL_MS);
    }

    try {
      console.error(`[summarize] (id=${article.id}) "${article.title}" 처리 중...`);

      const result = await summarizeArticle({
        title: article.title,
        content: article.raw_content ?? "",
      });

      await updateArticleSummary(article.id, result);

      console.error(`[summarize] (id=${article.id}) 완료: category="${result.category}"`);
      successCount++;
    } catch (error) {
      // 기사 하나가 (재시도까지) 최종 실패해도 나머지 기사 처리는 계속한다.
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[summarize] (id=${article.id}) 최종 실패, 다음 기사로 넘어갑니다: ${message}`
      );
      failureCount++;
    }
  }

  console.error(
    `[summarize] 완료: 성공 ${successCount}건 / 실패 ${failureCount}건 (총 ${pending.length}건)`
  );

  return { targetCount: pending.length, successCount, failureCount };
}
