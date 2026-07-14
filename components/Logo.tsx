"use client";

import { useState } from "react";

/**
 * 신성대학교 로고 이미지를 표시하는 Client Component.
 *
 * public/logo.png 파일이 아직 없는 경우 onError 핸들러로 감지해서
 * 깨진 이미지 아이콘 대신 자리를 비운다. onError 같은 이벤트 핸들러는
 * Server Component(app/page.tsx)에서 직접 쓸 수 없어 별도 컴포넌트로 분리했다.
 */
export default function Logo() {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <img
      src="/logo.png"
      alt="신성대학교 로고"
      className="h-10 w-auto shrink-0 object-contain sm:h-12"
      onError={() => setHidden(true)}
    />
  );
}
