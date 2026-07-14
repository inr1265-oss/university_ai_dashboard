import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한국대학신문 AI/AIDX 대시보드",
  description: "한국대학신문에서 수집한 AIDX/AID/AI 관련 기사를 카테고리별로 모아 봅니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
