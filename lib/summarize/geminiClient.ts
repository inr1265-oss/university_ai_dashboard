/**
 * Gemini API 클라이언트 생성 모듈.
 * GEMINI_API_KEY 환경 변수를 사용한다 (.env 또는 .env.example 참고).
 *
 * Google AI Studio(https://aistudio.google.com/apikey)에서 카드 등록 없이
 * 무료로 API 키를 발급받을 수 있다 (무료 티어 요청 한도 내에서 과금 없음).
 */

import { GoogleGenAI } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;

/**
 * 환경 변수를 검증하고 Gemini API 클라이언트를 생성(또는 캐시된 인스턴스를 반환)한다.
 * 환경 변수가 없으면 즉시 명확한 에러를 던진다.
 */
export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. " +
        "프로젝트 루트에 .env 파일을 만들고 값을 채워주세요 (.env.example 참고)."
    );
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}
