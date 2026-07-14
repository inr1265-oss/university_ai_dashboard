import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "신성대학교 AI/AIDX 대시보드",
  description: "한국대학신문에서 수집한 AIDX/AID/AI 관련 기사를 카테고리별로 모아 봅니다.",
  // public/favicon.ico 파일을 추가하면 브라우저 탭 아이콘(파비콘)에 자동 반영된다.
  // (아직 파일이 없으면 브라우저 기본 아이콘이 표시될 뿐 에러는 나지 않는다)
  icons: {
    icon: "/favicon.ico",
  },
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
