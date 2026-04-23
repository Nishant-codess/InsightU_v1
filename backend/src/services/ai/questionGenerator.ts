/**
 * AI Question Generator
 * Extracts text from PDFs and calls the configured AI provider to generate
 * multiple-choice questions in QuizQuestion[] format.
 */

import { getDecryptedApiKey } from './aiProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GeneratedQuestion {
  id: string;
  text: string;
  options: string[];       // exactly 4 options
  correctAnswer: number;   // 0-based index
  topic: string;
  points: number;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamically require pdf-parse to avoid ESM/CJS interop issues with tsx
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const fn: (buf: Buffer) => Promise<{ text: string }> =
    typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
  const data = await fn(buffer);
  return data.text.trim();
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  text: string,
  count: number,
  difficulty: Difficulty,
  topics: string[]
): string {
  const topicHint = topics.length > 0 ? `Focus on these topics: ${topics.join(', ')}.` : '';
  return `You are an expert educator. Generate exactly ${count} multiple-choice questions from the study material below.
Difficulty level: ${difficulty}. ${topicHint}

Rules:
- Each question must have exactly 4 answer options.
- Exactly one option is correct.
- Return ONLY a valid JSON array with no markdown fences, no explanation, nothing else.
- Each element must have this exact shape:
  { "id": "q-1", "text": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "topic": "...", "points": 10 }
- correctAnswer is the 0-based index of the correct option.
- Points: EASY=5, MEDIUM=10, HARD=15.

Study material:
---
${text.slice(0, 12000)}
---

Respond with ONLY the JSON array, starting with [ and ending with ].`;
}

// ─── OpenAI call ──────────────────────────────────────────────────────────────

async function callOpenAICompatible(
  apiKey: string,
  baseUrl: string,
  messages: AIMessage[]
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${err}`);
  }

  const json = (await response.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? '[]';
}

// ─── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error (${response.status}): ${err}`);
  }

  const json = (await response.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  return json.candidates[0]?.content?.parts[0]?.text ?? '[]';
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseAIResponse(raw: string): GeneratedQuestion[] {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // If the model wrapped it in an object, extract the array value
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to pull out the first JSON array from the string
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error('AI returned no parseable JSON array');
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch {
      throw new Error('AI returned malformed JSON');
    }
  }

  // Unwrap common wrapper keys
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)['questions'])
    ? ((parsed as Record<string, unknown>)['questions'] as unknown[])
    : Array.isArray((parsed as Record<string, unknown>)['items'])
    ? ((parsed as Record<string, unknown>)['items'] as unknown[])
    : [];

  return arr
    .filter(
      (q): q is GeneratedQuestion =>
        typeof q === 'object' &&
        q !== null &&
        typeof (q as GeneratedQuestion).text === 'string' &&
        Array.isArray((q as GeneratedQuestion).options) &&
        (q as GeneratedQuestion).options.length === 4 &&
        typeof (q as GeneratedQuestion).correctAnswer === 'number'
    )
    .map((q, i) => ({
      id: String((q as GeneratedQuestion).id ?? `q-${i + 1}`),
      text: (q as GeneratedQuestion).text,
      options: (q as GeneratedQuestion).options,
      correctAnswer: (q as GeneratedQuestion).correctAnswer,
      topic: (q as GeneratedQuestion).topic ?? 'General',
      points: (q as GeneratedQuestion).points ?? 10,
    }));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateQuestionsFromText(
  text: string,
  count: number,
  difficulty: Difficulty,
  userId: string,
  topics: string[] = []
): Promise<GeneratedQuestion[]> {
  const config = await getDecryptedApiKey(userId);
  if (!config) throw new Error('NO_AI_CONFIG');

  const prompt = buildPrompt(text, count, difficulty, topics);
  let raw: string;

  if (config.provider === 'GEMINI') {
    raw = await callGemini(config.apiKey, prompt);
  } else {
    const baseUrl =
      config.provider === 'CUSTOM' && config.baseUrl
        ? config.baseUrl
        : 'https://api.openai.com/v1';
    const messages: AIMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert educator. You only respond with valid JSON arrays of quiz questions. Never include markdown, explanations, or any text outside the JSON array.',
      },
      { role: 'user', content: prompt },
    ];
    raw = await callOpenAICompatible(config.apiKey, baseUrl, messages);
  }

  const questions = parseAIResponse(raw);
  if (questions.length === 0) {
    throw new Error('AI returned no valid questions. Try a different PDF or fewer questions.');
  }
  return questions;
}
