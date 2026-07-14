/**
 * 기사 분류 카테고리 정의.
 * Claude가 반환한 category 값이 이 목록에 정확히 일치하는지 검증하는 데 사용한다.
 */

export const CATEGORIES = ["정부 지원사업", "대학 사례", "기술 동향", "기타"] as const;

export type Category = (typeof CATEGORIES)[number];

/** 값이 허용된 카테고리 중 하나인지 확인하는 타입 가드 */
export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
