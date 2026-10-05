import { normalizeParsedReceipt, type NormalizedReceipt } from "./receiptNormalize.js";

export type ReceiptErrorCode =
  | "GEMINI_NOT_CONFIGURED"
  | "PARSE_FAILED"
  | "NOT_A_RECEIPT"
  | "IMAGE_UNREADABLE";

/** Parsing failed for a reason the client can explain to the user. Never replaced by fake data. */
export class ReceiptParseError extends Error {
  constructor(
    public code: ReceiptErrorCode,
    message: string,
    public httpStatus: number,
    public retryable = false
  ) {
    super(message);
    this.name = "ReceiptParseError";
  }
}

export interface ParseOptions {
  language: string; // BCP-47 like uz-UZ, ru-RU, en-US
  sessionName: string;
  mimeType: string;
  imageBase64: string; // raw base64, no data: prefix
}

export interface ParseResult extends NormalizedReceipt {
  source: "gemini" | "mock";
  model?: string;
  durationMs?: number;
}

const API_BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 60_000);
const MODEL_CACHE_MS = 6 * 60 * 60 * 1000;

function apiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

/** Demo data is only ever served when explicitly requested and never in production. */
export function isMockEnabled(): boolean {
  return process.env.RECEIPT_MOCK === "1" && process.env.NODE_ENV !== "production";
}

/** Models we prefer, best first. Only used to RANK what ListModels says actually exists. */
const PREFERRED = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
];
const EXCLUDED = /(embedding|tts|image|imagen|live|audio|native-audio|learnlm|robotics|computer-use|gemma|aqa|veo|-exp)/i;

/** Pure: pick usable models out of a ListModels response and rank them. */
export function pickModels(listed: Array<{ name?: string; supportedGenerationMethods?: string[] }>, wanted?: string): string[] {
  const usable = listed
    .filter((m) => m.name && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
    .map((m) => m.name!.replace(/^models\//, ""))
    .filter((id) => /^gemini-/.test(id) && !EXCLUDED.test(id));
  const unique = Array.from(new Set(usable));
  const rank = (id: string) => {
    if (wanted && id === wanted) return -1;
    const i = PREFERRED.indexOf(id);
    if (i >= 0) return i;
    return PREFERRED.length + (/flash/.test(id) ? 0 : 1);
  };
  return unique.sort((a, b) => rank(a) - rank(b) || b.localeCompare(a)).slice(0, 4);
}

let modelCache: { models: string[]; at: number } | null = null;
let startupLogged = false;

async function listModels(): Promise<string[]> {
  const url = `${API_BASE}/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey())}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!resp.ok) {
    throw new Error(`ListModels HTTP ${resp.status}: ${(await safeText(resp)).slice(0, 300)}`);
  }
  const json: any = await resp.json();
  return pickModels(json?.models ?? [], (process.env.GEMINI_MODEL_PARSE || "").trim() || undefined);
}

async function candidateModels(): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.models;
  try {
    const models = await listModels();
    if (models.length) {
      modelCache = { models, at: Date.now() };
      return models;
    }
    console.error("[receipt] ListModels returned no usable gemini model with generateContent");
  } catch (e) {
    console.error(`[receipt] ListModels failed, using the static model list: ${(e as Error).message}`);
  }
  const configured = (process.env.GEMINI_MODEL_PARSE || "").trim();
  return Array.from(new Set([configured, "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean)));
}

/** Call once on server start: tells the operator whether scanning will work and which model is used. */
export async function initReceiptParser(): Promise<void> {
  if (startupLogged) return;
  startupLogged = true;
  if (isMockEnabled()) {
    console.warn("[receipt] RECEIPT_MOCK=1: /sessions/scan returns DEMO data (source: mock). Never use this in production.");
    return;
  }
  if (!apiKey()) {
    console.error("[receipt] GEMINI_API_KEY is NOT set: receipt scanning is disabled (clients get GEMINI_NOT_CONFIGURED). Set the key, or RECEIPT_MOCK=1 for demo data in development.");
    return;
  }
  const models = await candidateModels();
  console.log(`[receipt] GEMINI_API_KEY is set; models (best first): ${models.join(", ")}`);
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isReceipt: { type: "BOOLEAN" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER" },
          unitPrice: { type: "NUMBER" },
          totalPrice: { type: "NUMBER" },
          kind: { type: "STRING", enum: ["item", "fee", "discount", "tax"] },
        },
        required: ["name", "quantity", "unitPrice", "totalPrice", "kind"],
      },
    },
    summary: {
      type: "OBJECT",
      properties: {
        subtotal: { type: "NUMBER", nullable: true },
        tax: { type: "NUMBER", nullable: true },
        serviceFee: { type: "NUMBER", nullable: true },
        discount: { type: "NUMBER", nullable: true },
        grandTotal: { type: "NUMBER", nullable: true },
        currency: { type: "STRING" },
      },
      required: ["grandTotal", "currency"],
    },
  },
  required: ["isReceipt", "items", "summary"],
};

export const EXTRACTION_PROMPT = `You read photos of restaurant / shop receipts (many from Uzbekistan: Uzbek, Russian or English text) and return structured JSON.

First decide if the image is a purchase receipt or bill. If it is NOT, return {"isReceipt": false, "items": [], "summary": {"grandTotal": null, "currency": "UZS"}}.

For a receipt:
- Extract EVERY purchased line exactly as printed. Keep the original language and spelling; do NOT translate, correct, merge or invent items. A name wrapped over several lines is ONE item.
- quantity: the number of units (e.g. "2 x 15 000", "2 шт", "2 dona" -> 2; no quantity -> 1). unitPrice: price of one unit. totalPrice: the printed line total (unitPrice * quantity).
- Prices: spaces or dots may be thousand separators and a comma is the decimal separator ("45 000,00" = 45000, "45.000" = 45000, "1 250,50" = 1250.5). Return plain JSON numbers without separators. The currency may be written "so'm", "сум", "UZS", "$", "₽"... Return the ISO 4217 code in summary.currency ("UZS" for so'm / сум).
- kind "item" for goods and dishes. kind "fee" for service charge (Xizmat haqi, Обслуживание, Service, tips). kind "discount" for discounts (Chegirma, Скидка) as NEGATIVE amounts. kind "tax" ONLY for a tax that is ADDED on top of the item prices (e.g. US sales tax).
- VAT lines (QQS, НДС, VAT) that are already included in the prices are NOT items: put them in summary.tax only. Likewise payment/total lines (Jami, Итого, Всего, Total, К оплате, Naqd, Наличные, Karta, Карта, Сдача, Qaytim) are NOT items.
- summary.subtotal, tax, serviceFee, discount and grandTotal: the values printed on the receipt, or null when not printed. grandTotal is the amount to pay.
- Never guess a price you cannot read: skip unreadable lines.`;

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

interface CallOutcome {
  kind: "ok" | "skip" | "fatal";
  text?: string;
  reason?: string;
  error?: ReceiptParseError;
}

async function callGemini(model: string, opts: ParseOptions): Promise<CallOutcome> {
  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey())}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${EXTRACTION_PROMPT}\n\nApp language: ${opts.language}.` },
          { inlineData: { mimeType: opts.mimeType, data: opts.imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = (e as Error).name === "TimeoutError" ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : (e as Error).message;
    console.error(`[receipt] ${model}: request failed: ${msg}`);
    return { kind: "skip", reason: msg };
  }

  if (!resp.ok) {
    const text = await safeText(resp);
    let message = text.slice(0, 300);
    try {
      message = JSON.parse(text)?.error?.message ?? message;
    } catch {
      /* not JSON */
    }
    console.error(`[receipt] ${model}: HTTP ${resp.status}: ${message}`);
    if (resp.status === 401 || resp.status === 403 || (resp.status === 400 && /api key/i.test(message))) {
      return {
        kind: "fatal",
        error: new ReceiptParseError("GEMINI_NOT_CONFIGURED", "The Gemini API key was rejected", 503),
      };
    }
    return { kind: "skip", reason: `HTTP ${resp.status}` };
  }

  const json: any = await resp.json();
  if (json?.promptFeedback?.blockReason) {
    console.error(`[receipt] ${model}: prompt blocked: ${json.promptFeedback.blockReason}`);
    return { kind: "fatal", error: new ReceiptParseError("IMAGE_UNREADABLE", "The image could not be processed", 422) };
  }
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p?.text ?? "").join("").trim();
  if (!text) {
    console.error(`[receipt] ${model}: empty response (finishReason=${json?.candidates?.[0]?.finishReason})`);
    return { kind: "skip", reason: "empty response" };
  }
  return { kind: "ok", text };
}

function parseModelJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fence?.[1] ?? text;
    const a = body.indexOf("{");
    const b = body.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    try {
      return JSON.parse(body.slice(a, b + 1));
    } catch {
      return null;
    }
  }
}

function mockResult(): ParseResult {
  const raw = {
    isReceipt: true,
    items: [
      { name: "Osh (DEMO)", quantity: 2, unitPrice: 45000, totalPrice: 90000, kind: "item" },
      { name: "Choy (DEMO)", quantity: 1, unitPrice: 12000, totalPrice: 12000, kind: "item" },
      { name: "Xizmat haqi 10% (DEMO)", quantity: 1, unitPrice: 10200, totalPrice: 10200, kind: "fee" },
    ],
    summary: { grandTotal: 112200, currency: "UZS" },
  };
  return { ...normalizeParsedReceipt(raw), source: "mock" };
}

export async function parseReceipt(options: ParseOptions): Promise<ParseResult> {
  if (isMockEnabled()) return mockResult();

  if (!apiKey()) {
    console.error("[receipt] scan requested but GEMINI_API_KEY is not set");
    throw new ReceiptParseError("GEMINI_NOT_CONFIGURED", "Receipt scanning is not configured on the server", 503);
  }

  const started = Date.now();
  const models = await candidateModels();
  let lastReason = "no model attempted";
  let sawUnparseable = false;

  for (const model of models) {
    const outcome = await callGemini(model, options);
    if (outcome.kind === "fatal") throw outcome.error!;
    if (outcome.kind === "skip") {
      lastReason = `${model}: ${outcome.reason}`;
      // a retired/unknown model: forget the cache so the next request re-lists models
      if (/HTTP 404/.test(outcome.reason || "")) modelCache = null;
      continue;
    }

    const raw = parseModelJson(outcome.text!);
    if (!raw) {
      sawUnparseable = true;
      lastReason = `${model}: invalid JSON`;
      console.error(`[receipt] ${model}: model output was not valid JSON (${outcome.text!.length} chars)`);
      continue;
    }

    const normalized = normalizeParsedReceipt(raw);
    if (!normalized.isReceipt) {
      throw new ReceiptParseError("NOT_A_RECEIPT", "This image does not look like a receipt", 422);
    }
    if (normalized.items.length === 0) {
      throw new ReceiptParseError("IMAGE_UNREADABLE", "No purchased items could be read from the image", 422);
    }
    if (normalized.warnings.length) console.warn(`[receipt] ${model}: ${normalized.warnings.join("; ")}`);
    return { ...normalized, source: "gemini", model, durationMs: Date.now() - started };
  }

  console.error(`[receipt] all models failed; last: ${lastReason}`);
  throw new ReceiptParseError("PARSE_FAILED", sawUnparseable ? "The receipt could not be understood" : "The receipt reader is unavailable", 502, true);
}
