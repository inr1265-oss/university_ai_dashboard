/**
 * Supabase articles 테이블과 대응하는 타입 정의.
 * supabase/schema.sql 의 컬럼 정의와 일치해야 한다.
 */

/** articles 테이블에 새로 저장(insert/upsert)할 때 쓰는 행 타입 */
export interface ArticleInsert {
  title: string;
  url: string;
  /** ISO 8601 문자열 또는 파싱 실패 시 null */
  published_at: string | null;
  /** ISO 8601 문자열 (수집 시각) */
  collected_at: string;
  /** LLM 분류 카테고리. 요약 단계 전에는 null */
  category: string | null;
  /** LLM 3줄 요약. 요약 단계 전에는 null */
  summary: string | null;
  /** 요약 이전 원문/본문(또는 RSS 요약) 텍스트 */
  raw_content: string | null;
}

/** articles 테이블에서 읽어온 행 타입 (id 포함) */
export interface Article extends ArticleInsert {
  id: number;
}
