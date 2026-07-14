/**
 * 통합 파이프라인: RSS 수집 -> 키워드 필터링 -> Supabase 저장 -> Gemini 요약/분류 -> 업데이트
 *
 * scripts/collect-articles.ts와 scripts/summarize-articles.ts의 로직을 하나로 묶은 스크립트로,
 * GitHub Actions(.github/workflows/crawl.yml)에서 이 스크립트 하나만 실행하면 된다.
 * 요약 단계의 실제 처리 로직(기사 사이 페이싱, 재시도, DB 업데이트)은
 * lib/summarize/processPendingArticles.ts에 있다 (scripts/summarize-articles.ts와 공유).
 *
 * 단계가 하나 실패해도 파이프라인 전체가 죽지 않도록 격리한다:
 * - 수집(1단계) 실패 시: 에러를 기록하고, 이미 DB에 저장돼 있던 기존 미요약 기사에 대해
 *   요약(2단계)은 계속 시도한다.
 * - 요약 단계에서 기사 하나가 (재시도까지) 실패해도 나머지 기사 처리는 계속한다.
 * - 어느 단계에서든 오류가 있었다면 마지막에 비정상 종료 코드(1)로 끝내
 *   GitHub Actions에서 실패로 표시되게 한다 (로그로 원인 확인 가능).
 *
 * 실행 방법:
 *   .env에 SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY 설정 (.env.example 참고)
 *   npm install
 *   npm run pipeline
 */

import "dotenv/config";
import { fetchRssFeed, DEFAULT_RSS_URL } from "../lib/crawler/fetchRssFeed";
import { filterArticlesByKeyword, KEYWORDS, type FilteredArticle } from "../lib/filter/keywordFilter";
import { saveArticles } from "../lib/db/articles";
import { summarizePendingArticles } from "../lib/summarize/processPendingArticles";
import type { ArticleInsert } from "../lib/types/article";

/** 한 번 실행할 때 요약할 최대 기사 수 (환경 변수로 조정 가능) */
const SUMMARIZE_BATCH_LIMIT = Number(process.env.SUMMARIZE_BATCH_LIMIT ?? 20);

function toArticleInsert(article: FilteredArticle): ArticleInsert {
  const parsedDate = article.pubDate ? new Date(article.pubDate) : null;
  const publishedAt =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;

  return {
    title: article.title,
    url: article.link,
    published_at: publishedAt,
    collected_at: new Date().toISOString(),
    category: null,
    summary: null,
    raw_content: article.summary || null,
  };
}

/** 1단계: RSS 수집 -> 키워드 필터링 -> Supabase 저장 (url 중복은 스킵) */
async function runCollectStage(): Promise<void> {
  console.error(`[1/2 collect] RSS 피드를 가져오는 중... (${DEFAULT_RSS_URL})`);
  const items = await fetchRssFeed();
  console.error(`[1/2 collect] 전체 기사 수: ${items.length}`);

  const filtered = filterArticlesByKeyword(items);
  console.error(
    `[1/2 collect] 키워드(${KEYWORDS.join(", ")}) 매칭 기사 수: ${filtered.length} / ${items.length}`
  );

  if (filtered.length === 0) {
    console.error("[1/2 collect] 저장할 신규 기사가 없습니다.");
    return;
  }

  const rows = filtered.map(toArticleInsert);
  const result = await saveArticles(rows);
  console.error(
    `[1/2 collect] 완료: 신규 저장 ${result.insertedCount}건 / 중복 스킵 ${result.skippedCount}건 (총 ${rows.length}건 중)`
  );
}

async function main(): Promise<void> {
  let hadError = false;

  try {
    await runCollectStage();
  } catch (error) {
    hadError = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[error] 수집 단계 실패: ${message}`);
    console.error(
      "[pipeline] 수집 단계는 실패했지만, 이미 저장돼 있던 기사에 대한 요약 단계는 계속 시도합니다."
    );
  }

  try {
    console.error("[2/2 summarize] 요약 단계 시작...");
    await summarizePendingArticles(SUMMARIZE_BATCH_LIMIT);
  } catch (error) {
    hadError = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[error] 요약 단계 실패: ${message}`);
  }

  if (hadError) {
    console.error("[pipeline] 일부 단계에서 오류가 발생했습니다. 위 로그를 확인하세요.");
    process.exitCode = 1;
  } else {
    console.error("[pipeline] 전체 파이프라인이 정상적으로 완료되었습니다.");
  }
}

main().catch((error) => {
  console.error("[error] 파이프라인 실행 중 예상치 못한 오류가 발생했습니다:", error);
  process.exitCode = 1;
});
