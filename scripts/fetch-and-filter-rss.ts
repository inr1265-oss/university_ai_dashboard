/**
 * 1단계: 한국대학신문 RSS 피드 파싱 + 키워드 필터링 테스트 스크립트
 *
 * DB 저장 없이, 필터링된 기사를 JSON 배열로 콘솔에 출력하기만 한다.
 * (DB에 저장까지 하는 파이프라인은 scripts/collect-articles.ts 참고)
 *
 * 실행 방법:
 *   npm install
 *   npm run fetch:rss
 */

import { fetchRssFeed, DEFAULT_RSS_URL } from "../lib/crawler/fetchRssFeed";
import { filterArticlesByKeyword, KEYWORDS } from "../lib/filter/keywordFilter";

async function main(): Promise<void> {
  console.error(`[fetch] RSS 피드를 가져오는 중... (${DEFAULT_RSS_URL})`);

  const items = await fetchRssFeed();
  console.error(`[fetch] 전체 기사 수: ${items.length}`);

  const filtered = filterArticlesByKeyword(items);
  console.error(
    `[filter] 키워드(${KEYWORDS.join(", ")}) 매칭 기사 수: ${filtered.length} / ${items.length}`
  );

  console.log(JSON.stringify(filtered, null, 2));
}

main().catch((error) => {
  console.error("[error] 스크립트 실행 중 오류가 발생했습니다:", error);
  process.exitCode = 1;
});
