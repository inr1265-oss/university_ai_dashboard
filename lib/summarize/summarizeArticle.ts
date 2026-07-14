/**
 * Gemini API로 기사를 3줄 요약하고 카테고리를 분류하는 모듈.
 *
 * JSON 강제 방법: Gemini API는 config.responseMimeType="application/json" +
 * config.responseSchema로 응답 스키마(및 category의 enum 값)를 직접 지정할 수 있다.
 * Claude의 "assistant 프리필" 같은 우회 트릭이 필요 없는, 더 안정적인 방식이다.
 * 다만 모델이 스키마를 100% 어기지 않는다는 보장은 없으므로, 응답을 받은 뒤에도
 * 동일하게 파싱/검증하고 실패 시 재시도한다.
 */

import { getGeminiClient } from "./geminiClient";
import { CATEGORIES, isCategory, type Category } from "./categories";

export interface SummarizeInput {
  title: string;
  /** 기사 본문 또는 RSS 요약 텍스트. 없으면 빈 문자열을 전달한다. */
  content: string;
}

export interface SummarizeResult {
  summary: string;
  category: Category;
}

/** 환경 변수로 모델을 바꿀 수 있게 한다 (무료 티어 한도/가용 모델은 AI Studio에서 확인). */
const MODEL = process.env.GEMINI_SUMMARIZE_MODEL ?? "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 512;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

const SYSTEM_PROMPT = `너는 한국대학신문 편집기자다. 다음 기사를 3줄로 요약하고 카테고리 중 하나를 골라라.

카테고리: ${CATEGORIES.join(", ")}

규칙:
- 요약은 반드시 한국어 3줄로 작성한다 (줄바꿈은 \\n으로 구분한 하나의 문자열).
- category는 위 카테고리 목록 중 정확히 하나의 값만 그대로 사용한다.`;

/** Gemini structured output에 전달할 응답 스키마. category는 enum으로 강제한다. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "한국어 3줄 요약. 줄바꿈은 \\n으로 구분한 하나의 문자열.",
    },
    category: {
      type: "string",
      enum: [...CATEGORIES],
    },
  },
  required: ["summary", "category"],
} as const;

function buildUserMessage(input: SummarizeInput): string {
  const content = input.content.trim() || "(본문 없음, 제목만으로 판단)";
  return `제목: ${input.title}\n\n본문:\n${content}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Gemini free tier rate limit(429 RESOURCE_EXHAUSTED) 에러인지 확인한다. */
function isRateLimitError(message: string): boolean {
  return message.includes("RESOURCE_EXHAUSTED") || message.includes('"code":429');
}

/**
 * 429 에러 메시지에 포함된 `"retryDelay":"42s"` 형태의 안내를 읽어 대기해야 할 초를 뽑아낸다.
 * 못 읽으면 null을 반환한다 (호출부에서 기본값을 쓴다).
 */
function extractRetryDelaySeconds(message: string): number | null {
  const match = message.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * Gemini 응답 텍스트를 파싱해 {summary, category}로 변환한다.
 * JSON 파싱 실패, 필드 누락, category 값이 허용 목록에 없는 경우 에러를 던진다
 * (호출부에서 재시도 대상으로 처리한다). responseSchema로 이미 강제하고 있지만,
 * 모델이 스키마를 어길 가능성에 대비해 한 번 더 검증한다.
 */
function parseResponse(rawText: string): SummarizeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini 응답을 JSON으로 파싱하지 못했습니다: ${rawText.slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Gemini 응답이 JSON 객체가 아닙니다: ${rawText.slice(0, 200)}`);
  }

  const { summary, category } = parsed as { summary?: unknown; category?: unknown };

  if (typeof summary !== "string" || summary.trim().length === 0) {
    throw new Error("Gemini 응답의 summary 값이 비어 있거나 문자열이 아닙니다.");
  }

  if (!isCategory(category)) {
    throw new Error(
      `Gemini 응답의 category 값이 허용 목록(${CATEGORIES.join(", ")})에 없습니다: ${String(category)}`
    );
  }

  return { summary: summary.trim(), category };
}

/**
 * 기사 하나를 Gemini API로 요약/분류한다.
 * API 호출 자체의 실패(네트워크 오류, 5xx, rate limit 등)와 응답 파싱/검증 실패를
 * 모두 "실패"로 간주해 최대 MAX_RETRIES(3)회까지 재시도한다.
 * - 일반 에러: 짧은 지수 백오프(1s, 2s, 4s)로 재시도한다.
 * - 429(RESOURCE_EXHAUSTED, 무료 티어 분당 요청 한도 초과) 에러: API가 알려준 대기 시간만큼
 *   (또는 기본 30초) 기다린 뒤 재시도한다. 짧은 백오프로는 한도가 안 풀리기 때문이다.
 * 모두 실패하면 에러를 던진다 (호출부에서 해당 기사만 건너뛰도록 처리).
 */
export async function summarizeArticle(input: SummarizeInput): Promise<SummarizeResult> {
  const client = getGeminiClient();

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: MODEL,
        contents: buildUserMessage(input),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          // gemini-2.5-flash는 답변 전에 내부적으로 "생각(thinking)" 토큰을 쓰는데,
          // 이 토큰도 maxOutputTokens 예산을 함께 소비해서 실제 응답이 잘리는 경우가 있다.
          // 단순 요약/분류 작업에는 thinking이 필요 없으므로 꺼서 예산을 전부 응답에 쓰게 한다.
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini 응답에서 텍스트를 찾을 수 없습니다.");
      }

      return parseResponse(text);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[summarize] 시도 ${attempt}/${MAX_RETRIES} 실패: ${message}`);

      if (attempt < MAX_RETRIES) {
        let delayMs: number;

        if (isRateLimitError(message)) {
          // 무료 티어 분당 요청 한도 초과. API가 알려준 대기 시간(+2초 여유) 만큼 기다린다.
          // 못 읽으면 넉넉하게 30초 기다린다 (일반 에러의 1s/2s/4s 백오프로는 부족하다).
          const retryDelaySeconds = extractRetryDelaySeconds(message);
          delayMs = (retryDelaySeconds !== null ? retryDelaySeconds + 2 : 30) * 1000;
          console.error(
            `[summarize] 무료 티어 요청 한도 초과 — ${Math.round(delayMs / 1000)}초 대기 후 재시도합니다...`
          );
        } else {
          delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        }

        await sleep(delayMs);
      }
    }
  }

  const finalMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Gemini 요약/분류에 ${MAX_RETRIES}회 모두 실패했습니다: ${finalMessage}`);
}
