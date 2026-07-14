/**
 * 2단계: RSS 피드 수집 -> 키워드 필터링 -> Supabase(articles 테이블) 저장 파이프라인.
 *
 * - url 기준으로 이미 저장된 기사는 스킵한다 (lib/db/articles.ts의 upsert ignoreDuplicates).
 * - category, summary는 아직 LLM 요약/분류 단계 이전이라 null로 저장한다.
 *   (다음 단계에서 Claude API로 채울 예정)
 *
 * 실행 방법:
 *   cp .env.example .env   # SUPABASE_URL, SUPABASE_KEY 값 채우기
 *   npm install
 *   npm run collect
 */

import "dotenv/config";
import { fetchRssFeed, DEFAULT_RSS_URL } from "../lib/crawler/fetchRssFeed";
import { filterArticlesByKeyword, KEYWORDS, type FilteredArticle } from "../lib/filter/keywordFilter";
import { saveArticles } from "../lib/db/articles";
import type { ArticleInsert } from "../lib/types/article";

/**
 * 필터링된 기사(FilteredArticle)를 articles 테이블 저장용 행(ArticleInsert)으로 변환한다.
 * pubDate 파싱에 실패하면 published_at은 null로 저장한다 (저장 자체가 실패하지 않도록).
 */
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

async function main(): Promise<void> {
  console.error(`[fetch] RSS 피드를 가져오는 중... (${DEFAULT_RSS_URL})`);
  const items = await fetchRssFeed();
  console.error(`[fetch] 전체 기사 수: ${items.length}`);

  const filtered = filterArticlesByKeyword(items);
  console.error(
    `[filter] 키워드(${KEYWORDS.join(", ")}) 매칭 기사 수: ${filtered.length} / ${items.length}`
  );

  if (filtered.length === 0) {
    console.error("[save] 저장할 기사가 없어 종료합니다.");
    return;
  }

  const rows = filtered.map(toArticleInsert);

  console.error(`[save] Supabase에 ${rows.length}건 upsert 시도 중 (url 기준 중복은 스킵)...`);
  const result = await saveArticles(rows);

  console.error(
    `[save] 완료: 신규 저장 ${result.insertedCount}건 / 중복 스킵 ${result.skippedCount}건 (총 ${rows.length}건 중)`
  );

  if (result.insertedUrls.length > 0) {
    console.log(JSON.stringify(result.insertedUrls, null, 2));
  }
}

main().catch((error) => {
  console.error("[error] 스크립트 실행 중 오류가 발생했습니다:", error);
  process.exitCode = 1;
});
