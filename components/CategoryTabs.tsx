import Link from "next/link";
import { CATEGORIES } from "../lib/summarize/categories";

const ALL_LABEL = "전체";
const TABS: readonly string[] = [ALL_LABEL, ...CATEGORIES];

interface CategoryTabsProps {
  /** 현재 선택된 카테고리 ("전체" 포함) */
  activeCategory: string;
}

/**
 * 상단 카테고리 필터 탭. 서버 컴포넌트로, 각 탭은 쿼리스트링(category)을 바꾸는
 * 일반 링크라서 별도 클라이언트 상태 없이 동작한다.
 */
export default function CategoryTabs({ activeCategory }: CategoryTabsProps) {
  return (
    <nav aria-label="카테고리 필터" className="border-b border-gray-200">
      <ul className="-mb-px flex flex-wrap gap-1 overflow-x-auto sm:gap-2">
        {TABS.map((tab) => {
          const isActive = tab === activeCategory;
          const href = tab === ALL_LABEL ? "/" : `/?category=${encodeURIComponent(tab)}`;

          return (
            <li key={tab}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors sm:text-base ${
                  isActive
                    ? "border-blue-600 font-semibold text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
