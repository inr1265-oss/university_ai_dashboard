import type { ArticleListItem } from "../lib/db/articles";

/**
 * 날짜 문자열을 "YYYY.MM.DD" 형태로 변환한다.
 * 값이 없거나 파싱에 실패하면 "게재일 미상"을 반환한다 (렌더링이 죽지 않도록 방어).
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "게재일 미상";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "게재일 미상";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface ArticleCardProps {
  article: ArticleListItem;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  // summary는 "\n"으로 구분된 3줄 형태로 저장되어 있다 (lib/summarize 참고).
  const summaryLines = article.summary
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {article.category}
        </span>
        <time
          dateTime={article.published_at ?? undefined}
          className="whitespace-nowrap text-xs text-gray-400"
        >
          {formatDate(article.published_at)}
        </time>
      </div>

      <h2 className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
        {article.title}
      </h2>

      {summaryLines.length > 0 && (
        <ul className="flex-1 space-y-1 text-sm text-gray-600">
          {summaryLines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex w-fit items-center text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        원문 보기
        <span aria-hidden="true" className="ml-1">
          →
        </span>
      </a>
    </article>
  );
}
