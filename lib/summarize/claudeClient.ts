/**
 * Claude API 클라이언트 생성 모듈.
 * ANTHROPIC_API_KEY 환경 변수를 사용한다 (.env 또는 .env.example 참고).
 */

import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/**
 * 환경 변수를 검증하고 Claude API 클라이언트를 생성(또는 캐시된 인스턴스를 반환)한다.
 * 환경 변수가 없으면 즉시 명확한 에러를 던진다.
 */
export function getClaudeClient(): Anthropic {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경 변수가 설정되어 있지 않습니다. " +
        "프로젝트 루트에 .env 파일을 만들고 값을 채워주세요 (.env.example 참고)."
    );
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}
