import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, normalizeParsedReceipt, normalizeCurrencyCode } from "../src/services/receiptNormalize.js";
import { pickModels, parseReceipt, ReceiptParseError } from "../src/services/receiptParser.js";

test("parseMoney handles Uzbek / Russian / English price formats", () => {
  assert.equal(parseMoney("45 000,00"), 45000);
  assert.equal(parseMoney("45 000"), 45000);
  assert.equal(parseMoney("45.000"), 45000);
  assert.equal(parseMoney("1 250,50"), 1250.5);
  assert.equal(parseMoney("1,234.56"), 1234.56);
  assert.equal(parseMoney("1.234,56"), 1234.56);
  assert.equal(parseMoney("1.234.567"), 1234567);
  assert.equal(parseMoney("15 000 so'm"), 15000);
  assert.equal(parseMoney("12 500 сум"), 12500);
  assert.equal(parseMoney("0,5"), 0.5);
  assert.equal(parseMoney("-5 000"), -5000);
  assert.equal(parseMoney("(5 000)"), -5000);
  assert.equal(parseMoney(12.5), 12.5);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney(NaN), null);
  assert.equal(parseMoney(null), null);
});

test("currency names map to ISO codes", () => {
  assert.equal(normalizeCurrencyCode("so'm"), "UZS");
  assert.equal(normalizeCurrencyCode("сум"), "UZS");
  assert.equal(normalizeCurrencyCode("UZS"), "UZS");
  assert.equal(normalizeCurrencyCode("$"), "USD");
  assert.equal(normalizeCurrencyCode("UNKNOWN"), null);
});

const UZ_RECEIPT = {
  isReceipt: true,
  items: [
    { name: "  Osh   (katta) ", quantity: 2, unitPrice: 45000, totalPrice: 90000, kind: "item" },
    { name: "Coca-Cola 0.5", quantity: "1", unitPrice: "12 000,00", totalPrice: "12 000,00", kind: "item" },
    { name: "Xizmat haqi 10%", quantity: 1, unitPrice: 10200, totalPrice: 10200, kind: "fee" },
    { name: "Chegirma", quantity: 1, unitPrice: 2000, totalPrice: 2000, kind: "discount" },
  ],
  summary: { subtotal: 102000, tax: 12240, serviceFee: 10200, discount: 2000, grandTotal: 110200, currency: "so'm" },
};

test("normalize: Uzbek receipt with a service fee, discount and included VAT", () => {
  const r = normalizeParsedReceipt(UZ_RECEIPT);
  assert.equal(r.summary.currency, "UZS");
  assert.deepEqual(r.items.map((i) => i.name), ["Osh (katta)", "Coca-Cola 0.5", "Xizmat haqi 10%", "Chegirma"]);
  assert.deepEqual(r.items.map((i) => i.kind), ["item", "item", "fee", "discount"]);
  assert.equal(r.items[3]!.totalPrice, -2000); // discounts are negative
  assert.equal(r.items[1]!.totalPrice, 12000);
  assert.equal(r.totalsMismatch, 0); // 90000+12000+10200-2000 = 110200 = printed total
});

test("normalize: reports a totals mismatch instead of hiding it", () => {
  const r = normalizeParsedReceipt({ ...UZ_RECEIPT, summary: { ...UZ_RECEIPT.summary, grandTotal: 120200 } });
  assert.equal(r.totalsMismatch, 10000);
  const none = normalizeParsedReceipt({ ...UZ_RECEIPT, summary: { currency: "UZS", grandTotal: null } });
  assert.equal(none.totalsMismatch, null);
});

test("normalize: quantity>=1, total is authoritative, bad lines dropped", () => {
  const r = normalizeParsedReceipt({
    isReceipt: true,
    items: [
      { name: "Water", quantity: 3, unitPrice: 33.33, totalPrice: 100, kind: "item" }, // rounding: printed total wins
      { name: "Cheese 0.35 kg", quantity: 0.35, unitPrice: 80000, totalPrice: 28000, kind: "item" }, // weight line
      { name: "", quantity: 1, unitPrice: 5, totalPrice: 5, kind: "item" },
      { name: "Broken", quantity: 1, unitPrice: NaN, totalPrice: null, kind: "item" },
      { name: "Negative", quantity: 1, unitPrice: -5, totalPrice: -5, kind: "item" },
    ],
    summary: { grandTotal: 128, currency: "USD" },
  });
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0]!.quantity, 3);
  assert.equal(r.items[0]!.totalPrice, 100);
  assert.ok(Math.abs(r.items[0]!.unitPrice * 3 - 100) < 0.02);
  assert.equal(r.items[1]!.quantity, 1);
  assert.equal(r.items[1]!.totalPrice, 28000);
  assert.ok(r.items.every((i) => Number.isFinite(i.unitPrice) && Number.isFinite(i.totalPrice)));
  assert.ok(r.warnings.length >= 3);
});

test("pickModels keeps only existing generateContent gemini models, best first", () => {
  const listed = [
    { name: "models/gemini-1.5-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent", "countTokens"] },
    { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
    { name: "models/gemini-2.5-flash-image", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.0-flash-exp", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
  ];
  assert.deepEqual(pickModels(listed), ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"]);
  assert.equal(pickModels(listed, "gemini-1.5-flash")[0], "gemini-1.5-flash");
  assert.deepEqual(pickModels([]), []);
});

// ---- parseReceipt with a fake Gemini ----
const realFetch = globalThis.fetch;
const OPTS = { language: "uz-UZ", sessionName: "t", mimeType: "image/jpeg", imageBase64: "A".repeat(300) };
let calls: string[] = [];

function fakeGemini(handler: (url: string, body: any) => { status: number; json: any }) {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    calls.push(url.replace(/key=[^&]+/, "key=***"));
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const { status, json } = handler(url, body);
    return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
  }) as any;
}
const modelsList = { models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] };
const okBody = (payload: any) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] });

beforeEach(() => {
  calls = [];
  process.env.GEMINI_API_KEY = "AIzaTESTKEY1234567890";
  delete process.env.RECEIPT_MOCK;
  process.env.NODE_ENV = "test";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("no API key -> GEMINI_NOT_CONFIGURED, never mock data", async () => {
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e instanceof ReceiptParseError && e.code === "GEMINI_NOT_CONFIGURED" && e.httpStatus === 503);
});

test("mock only with RECEIPT_MOCK=1 outside production, and it is marked source=mock", async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.RECEIPT_MOCK = "1";
  const r = await parseReceipt(OPTS);
  assert.equal(r.source, "mock");
  assert.ok(r.items[0]!.name.includes("DEMO"));
  process.env.NODE_ENV = "production";
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e.code === "GEMINI_NOT_CONFIGURED");
});

test("all models failing -> PARSE_FAILED (no mock fallback)", async () => {
  fakeGemini((url) => (url.includes(":generateContent") ? { status: 404, json: { error: { message: "model not found" } } } : { status: 200, json: modelsList }));
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e.code === "PARSE_FAILED" && e.httpStatus === 502);
});

test("rejected API key -> GEMINI_NOT_CONFIGURED", async () => {
  fakeGemini((url) => (url.includes(":generateContent") ? { status: 400, json: { error: { message: "API key not valid. Please pass a valid API key." } } } : { status: 200, json: modelsList }));
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e.code === "GEMINI_NOT_CONFIGURED");
});

test("structured output request + successful parse", async () => {
  let seenBody: any;
  fakeGemini((url, body) => {
    if (url.includes(":generateContent")) {
      seenBody = body;
      return { status: 200, json: okBody(UZ_RECEIPT) };
    }
    return { status: 200, json: modelsList };
  });
  const r = await parseReceipt(OPTS);
  assert.equal(r.source, "gemini");
  assert.equal(r.items.length, 4);
  assert.equal(r.summary.currency, "UZS");
  assert.ok(calls.some((u) => u.includes("/v1beta/models/gemini-2.5-flash:generateContent")));
  assert.equal(seenBody.generationConfig.responseMimeType, "application/json");
  assert.equal(seenBody.generationConfig.responseSchema.properties.items.items.properties.kind.enum.length, 4);
});

test("isReceipt=false -> NOT_A_RECEIPT; empty item list -> IMAGE_UNREADABLE", async () => {
  fakeGemini((url) => (url.includes(":generateContent") ? { status: 200, json: okBody({ isReceipt: false, items: [], summary: { grandTotal: null, currency: "UZS" } }) } : { status: 200, json: modelsList }));
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e.code === "NOT_A_RECEIPT" && e.httpStatus === 422);
  fakeGemini((url) => (url.includes(":generateContent") ? { status: 200, json: okBody({ isReceipt: true, items: [], summary: { grandTotal: null, currency: "UZS" } }) } : { status: 200, json: modelsList }));
  await assert.rejects(() => parseReceipt(OPTS), (e: any) => e.code === "IMAGE_UNREADABLE");
});
