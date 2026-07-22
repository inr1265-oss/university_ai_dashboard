/**
 * Supabase 클라이언트 생성 모듈.
 *
 * SUPABASE_URL, SUPABASE_KEY 환경 변수를 사용한다 (.env 또는 .env.example 참고).
 * 크롤러/배치 스크립트(서버 환경)에서는 RLS를 우회하는 service_role 키 사용을 권장한다.
 * service_role 키는 절대 브라우저/클라이언트 코드에 노출하지 않는다.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let cachedClient: SupabaseClient | null = null;

/**
 * 환경 변수를 검증하고 Supabase 클라이언트를 생성(또는 캐시된 인스턴스를 반환)한다.
 * 환경 변수가 없으면 즉시 명확한 에러를 던진다 (호출 시점에 빨리 실패시키기 위함).
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_KEY 환경 변수가 설정되어 있지 않습니다. " +
        "프로젝트 루트에 .env 파일을 만들고 값을 채워주세요 (.env.example 참고)."
    );
  }

  try {
    cachedClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      // 최신 @supabase/supabase-js는 클라이언트 생성 시점에 native WebSocket을
      // 확인하는데, Node.js 버전/실행 환경에 따라(특히 GitHub Actions의
      // ubuntu-latest 러너) 이 감지가 실패해 "native WebSocket not found"
      // 에러로 클라이언트 생성 자체가 죽는 경우가 있다. 이 프로젝트는 realtime
      // 기능을 쓰지 않지만, ws 패키지를 명시적으로 넘겨 감지 문제를 우회한다.
      realtime: {
        // ws 패키지와 브라우저 표준 WebSocket 간 타입이 완전히 일치하지 않아
        // 이 한 줄만 예외적으로 캐스팅한다 (CLAUDE.md의 any 지양 원칙에 대한
        // 의도적인 예외 — 라이브러리 타입 정의 한계로 인한 것).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: WebSocket as any,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Supabase 클라이언트 생성에 실패했습니다: ${error.message}`);
    }
    throw new Error(`Supabase 클라이언트 생성에 실패했습니다: ${String(error)}`);
  }

  return cachedClient;
}
