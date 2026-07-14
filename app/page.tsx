import CategoryTabs from "../components/CategoryTabs";
import ArticleCard from "../components/ArticleCard";
import Pagination from "../components/Pagination";
import Logo from "../components/Logo";
import { getPublishedArticles, type GetPublishedArticlesResult } from "../lib/db/articles";
import { isCategory } from "../lib/summarize/categories";

const PAGE_SIZE = 12;
const ALL_LABEL = "전체";

// 60초마다 재검증 (ISR): 새로 요약된 기사가 대시보드에 어느 정도 지연 후 반영된다.
export const revalidate = 60;

// Next.js 14 기준: 서버 컴포넌트는 searchParams를 일반 객체로 받는다.
// (Next.js 15+로 올리는 경우 searchParams가 Promise로 바뀌므로 await 처리가 필요하다)
interface DashboardPageProps {
  searchParams?: { category?: string; page?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const rawCategory = searchParams?.category;
  const activeCategory = rawCategory && isCategory(rawCategory) ? rawCategory : ALL_LABEL;

  const rawPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  let result: GetPublishedArticlesResult | null = null;
  let loadError: string | null = null;

  try {
    result = await getPublishedArticles({
      category: activeCategory === ALL_LABEL ? undefined : activeCategory,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    // DB 조회 실패가 페이지 전체를 죽이지 않도록 에러 메시지만 보여준다.
    loadError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center gap-3 sm:mb-8">
        {/* public/logo.png 파일을 추가하면 이 자리에 신성대학교 로고가 표시된다. */}
        <Logo />
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            신성대학교 AI/AIDX 대시보드
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            한국대학신문에서 AIDX, AID, AI, 인공지능, 디지털전환 관련 기사를 자동으로 모아 요약합니다.
          </p>
        </div>
      </header>

      <CategoryTabs activeCategory={activeCategory} />

      <section className="mt-6 sm:mt-8">
        {loadError ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            기사를 불러오는 중 오류가 발생했습니다: {loadError}
          </p>
        ) : result && result.items.length === 0 ? (
          <p className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            아직 이 카테고리에 표시할 기사가 없습니다.
          </p>
        ) : result ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {result.items.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : null}
      </section>

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} category={activeCategory} />
      )}
    </main>
  );
}
