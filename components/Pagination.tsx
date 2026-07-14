import Link from "next/link";
import type { ReactNode } from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** 현재 선택된 카테고리 ("전체" 포함). 페이지 이동 시 함께 유지한다. */
  category: string;
}

function buildHref(page: number, category: string): string {
  const params = new URLSearchParams();
  if (category !== "전체") params.set("category", category);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function NavLink({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-gray-100 px-3 py-1.5 text-sm text-gray-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

export default function Pagination({ page, totalPages, category }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="페이지네이션" className="flex items-center justify-center gap-4 py-8">
      <NavLink disabled={!hasPrev} href={buildHref(page - 1, category)}>
        이전
      </NavLink>
      <span className="text-sm text-gray-500">
        {page} / {totalPages}
      </span>
      <NavLink disabled={!hasNext} href={buildHref(page + 1, category)}>
        다음
      </NavLink>
    </nav>
  );
}
