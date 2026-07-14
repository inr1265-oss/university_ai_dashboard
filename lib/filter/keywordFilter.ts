/**
 * 기사 제목/본문에서 AIDX/AID/AI 관련 키워드를 검사하고 걸러내는 모듈.
 */

import type { FeedItem } from "../crawler/fetchRssFeed";

/**
 * 필터링 키워드 목록.
 * 제목 또는 본문(요약)에 아래 키워드 중 하나라도 포함되면 대상 기사로 간주한다.
 * 대소문자 구분 없이 매칭한다.
 *
 * 주의: "AI"는 두 글자로 매우 짧은 키워드라 오탐(false positive) 가능성이 있다.
 * (예: 영문 고유명사나 약어 안에 우연히 "ai"가 포함된 경우)
 * 오탐이 많이 보이면 단어 경계 매칭 등으로 정교화한다.
 */
export const KEYWORDS = ["AIDX", "AID", "AI", "인공지능", "디지털전환", "디지털 전환"];

export interface FilteredArticle {
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

/**
 * 주어진 텍스트에 필터링 키워드가 하나라도 포함되어 있는지 확인한다.
 * 대소문자 구분 없이 단순 부분 문자열 매칭을 사용한다.
 */
function containsKeyword(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

/**
 * RSS 아이템에서 요약으로 사용할 텍스트를 뽑아낸다.
 * contentSnippet(태그 제거된 본문 요약) 우선, 없으면 summary, content 순으로 사용한다.
 */
function extractSummary(item: FeedItem): string {
const raw = item.contentSnippet ?? item.summary ?? item.content ?? "";
  return raw.trim();
}

/**
 * 피드 아이템 중 키워드가 포함된 기사만 걸러 표준 형태로 매핑한다.
 * 개별 아이템 처리 실패가 전체 필터링을 중단시키지 않도록 격리한다.
 */
export function filterArticlesByKeyword(items: FeedItem[]): FilteredArticle[] {
  const results: FilteredArticle[] = [];

  for (const item of items) {
    try {
      const title = item.title?.trim() ?? "";
      const link = item.link?.trim() ?? "";
      const pubDate = item.pubDate ?? item.isoDate ?? "";
      const summary = extractSummary(item);

      const target = `${title} ${summary}`;
      if (containsKeyword(target)) {
        results.push({ title, link, pubDate, summary });
      }
    } catch (error) {
      console.error("[filter] 기사 항목 처리 중 오류, 건너뜁니다:", error);
    }
  }

  return results;
}
