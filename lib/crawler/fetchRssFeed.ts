/**
 * 한국대학신문 RSS 피드를 가져오고 파싱하는 모듈.
 */

import Parser from "rss-parser";

/** 한국대학신문 전체기사 RSS 피드 URL (news.unn.net/rssIndex.html의 "전체기사" 링크) */
export const DEFAULT_RSS_URL = "https://news.unn.net/rss/allArticle.xml";

/** rss-parser가 반환하는 표준 RSS 아이템 타입 */
export type FeedItem = Parser.Item;

/**
 * RSS 피드를 가져와 파싱한다. 네트워크 오류, 파싱 오류를 구분해 에러 메시지를 남긴다.
 *
 * @param url 가져올 RSS 피드 URL. 기본값은 한국대학신문 전체기사 피드.
 * @returns 피드에 포함된 아이템 배열
 */
export async function fetchRssFeed(url: string = DEFAULT_RSS_URL): Promise<FeedItem[]> {
  const parser = new Parser({
    timeout: 15000,
    headers: {
      // 일부 서버는 User-Agent가 없으면 차단하는 경우가 있어 명시적으로 지정한다.
      "User-Agent":
        "Mozilla/5.0 (compatible; UNN-AI-Dashboard-Bot/1.0; +https://github.com/)",
    },
  });

  try {
    const feed = await parser.parseURL(url);
    return feed.items ?? [];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`RSS 피드를 가져오거나 파싱하는 데 실패했습니다 (${url}): ${error.message}`);
    }
    throw new Error(`RSS 피드를 가져오거나 파싱하는 데 실패했습니다 (${url}): ${String(error)}`);
  }
}
