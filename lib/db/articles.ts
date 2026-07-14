/**
 * articles 테이블에 대한 저장(insert/upsert) 로직.
 */

import { getSupabaseClient } from "./supabaseClient";
import type { ArticleInsert } from "../types/article";
import type { Category } from "../summarize/categories";

export interface SaveArticlesResult {
  /** 새로 저장된(신규) 기사 수 */
  insertedCount: number;
  /** url 중복으로 스킵된 기사 수 */
  skippedCount: number;
  /** 새로 저장된 기사의 url 목록 */
  insertedUrls: string[];
}

/**
 * 기사 목록을 articles 테이블에 upsert한다.
 * url 컬럼의 unique 제약을 기준으로 이미 존재하는 기사는 조용히 스킵하고
 * (ON CONFLICT DO NOTHING과 동일하게 동작) 새 기사만 삽입한다.
 *
 * @param articles 저장할 기사 배열
 */
export async function saveArticles(articles: ArticleInsert[]): Promise<SaveArticlesResult> {
  if (articles.length === 0) {
    return { insertedCount: 0, skippedCount: 0, insertedUrls: [] };
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("articles")
      .upsert(articles, { onConflict: "url", ignoreDuplicates: true })
      .select("url");

    if (error) {
      throw new Error(`Supabase에 기사를 저장하는 데 실패했습니다: ${error.message}`);
    }

    const insertedUrls = (data ?? []).map((row) => (row as { url: string }).url);
    const insertedCount = insertedUrls.length;
    const skippedCount = articles.length - insertedCount;

    return { insertedCount, skippedCount, insertedUrls };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Supabase에 기사를 저장하는 중 알 수 없는 오류가 발생했습니다: ${String(error)}`);
  }
}

/** 요약 대상으로 조회할 때 필요한 최소 필드만 담은 타입 */
export interface PendingArticle {
  id: number;
  title: string;
  raw_content: string | null;
}

/**
 * 아직 요약(summary)이 없는 기사를 오래된 순으로 가져온다.
 *
 * @param limit 한 번에 가져올 최대 건수 (기본 20)
 */
export async function getArticlesPendingSummary(limit = 20): Promise<PendingArticle[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, raw_content")
      .is("summary", null)
      .order("collected_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`요약이 없는 기사를 조회하는 데 실패했습니다: ${error.message}`);
    }

    return (data ?? []) as PendingArticle[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`요약이 없는 기사를 조회하는 중 알 수 없는 오류가 발생했습니다: ${String(error)}`);
  }
}

/**
 * 기사 하나의 summary, category를 업데이트한다.
 *
 * @param id 대상 기사의 id
 * @param update 업데이트할 summary, category 값
 */
export async function updateArticleSummary(
  id: number,
  update: { summary: string; category: Category }
): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from("articles")
      .update({ summary: update.summary, category: update.category })
      .eq("id", id);

    if (error) {
      throw new Error(`기사(id=${id})의 요약을 업데이트하는 데 실패했습니다: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`기사(id=${id})의 요약을 업데이트하는 중 알 수 없는 오류가 발생했습니다: ${String(error)}`);
  }
}

/** 대시보드 목록에 표시할 기사 한 건의 형태 */
export interface ArticleListItem {
  id: number;
  title: string;
  url: string;
  published_at: string | null;
  category: Category;
  summary: string;
}

export interface GetPublishedArticlesParams {
  /** 지정하지 않으면 전체 카테고리를 대상으로 한다 */
  category?: Category;
  /** 1부터 시작하는 페이지 번호 (기본 1) */
  page?: number;
  /** 페이지당 기사 수 (기본 12) */
  pageSize?: number;
}

export interface GetPublishedArticlesResult {
  items: ArticleListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 대시보드에 표시할 기사를 조회한다.
 * - category/summary가 아직 채워지지 않은(요약 전) 기사는 제외한다.
 * - published_at 최신순으로 정렬한다 (published_at이 없는 경우 collected_at을 보조 기준으로 사용).
 * - page/pageSize로 페이지네이션한다.
 */
export async function getPublishedArticles(
  params: GetPublishedArticlesParams = {}
): Promise<GetPublishedArticlesResult> {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.floor(params.pageSize) : 12;

  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from("articles")
      .select("id, title, url, published_at, category, summary", { count: "exact" })
      .not("category", "is", null)
      .not("summary", "is", null);

    if (params.category) {
      query = query.eq("category", params.category);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("collected_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`대시보드용 기사를 조회하는 데 실패했습니다: ${error.message}`);
    }

    const totalCount = count ?? 0;

    return {
      items: (data ?? []) as ArticleListItem[],
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`대시보드용 기사를 조회하는 중 알 수 없는 오류가 발생했습니다: ${String(error)}`);
  }
}
