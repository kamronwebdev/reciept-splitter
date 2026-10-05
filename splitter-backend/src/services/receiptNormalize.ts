import { currencyDecimals } from "../utils/split.js";

export type ParsedKind = "item" | "fee" | "discount" | "tax";

export interface ParsedReceiptItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  kind: ParsedKind;
}

export interface ReceiptSummary {
  subtotal: number | null;
  tax: number | null;
  serviceFee: number | null;
  discount: number | null;
  grandTotal: number | null;
  currency: string;
}

export interface NormalizedReceipt {
  isReceipt: boolean;
  items: ParsedReceiptItem[];
  summary: ReceiptSummary;
  /** receipt grand total minus the sum of the parsed lines (0 = consistent, null = receipt had no total) */
  totalsMismatch: number | null;
  warnings: string[];
}

export const DEFAULT_CURRENCY = "UZS";

/** Parses "45 000,00", "45.000", "1,234.56", "45'000", "-5 000", "(5 000)" and plain numbers. */
export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let s = value.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^[-−–]/.test(s) || /[-−–]$/.test(s)) negative = true;

  // keep digits and separators only (drops currency words like so'm, сум, UZS, символы)
  s = s.replace(/\s+/g, "").replace(/[^0-9.,]/g, "");
  if (!s || !/\d/.test(s)) return null;

  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  let normalized: string;

  if (dots > 0 && commas > 0) {
    // the LAST separator is the decimal one, the other kind is a thousands separator
    const decimalSep = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = s.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (dots + commas > 0) {
    const sep = dots > 0 ? "." : ",";
    const count = dots + commas;
    const parts = s.split(sep);
    const last = parts[parts.length - 1]!;
    if (count > 1) {
      // 1.234.567 -> thousands separators
      normalized = parts.join("");
    } else if (last.length === 3 && parts[0] !== "0" && parts[0] !== "" ) {
      // "45.000" / "1,234": three digits after a single separator = thousands
      normalized = parts.join("");
    } else {
      normalized = parts.join(".");
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const SYMBOL_TO_ISO: Record<string, string> = {
  $: "USD", USD: "USD", "US$": "USD", "€": "EUR", EUR: "EUR", "£": "GBP", GBP: "GBP",
  "¥": "JPY", JPY: "JPY", 円: "JPY", "₽": "RUB", RUB: "RUB", RUR: "RUB", РУБ: "RUB",
  "₴": "UAH", UAH: "UAH", "₩": "KRW", KRW: "KRW", "₹": "INR", INR: "INR", "₺": "TRY", TRY: "TRY",
  KZT: "KZT", "₸": "KZT", ТЕНГЕ: "KZT", CAD: "CAD", AUD: "AUD", CHF: "CHF",
  // Uzbekistan
  UZS: "UZS", SOM: "UZS", SOʻM: "UZS", SUM: "UZS", СУМ: "UZS", СЎМ: "UZS", СОМ: "UZS", СЎМЛАР: "UZS", SOMLAR: "UZS",
};

export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (SYMBOL_TO_ISO[trimmed]) return SYMBOL_TO_ISO[trimmed]!;
  if (SYMBOL_TO_ISO[upper]) return SYMBOL_TO_ISO[upper]!;
  const lettersOnly = upper.replace(/[^A-ZА-ЯЎҚҒҲ]/g, "");
  if (SYMBOL_TO_ISO[lettersOnly]) return SYMBOL_TO_ISO[lettersOnly]!;
  if (upper === "UNKNOWN") return null;
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return null;
}

export function normalizeKind(value: unknown): ParsedKind {
  const k = String(value ?? "item").trim().toLowerCase();
  if (k === "discount" || k === "refund" || k === "chegirma" || k === "скидка") return "discount";
  if (k === "tax" || k === "vat" || k === "qqs" || k === "ндс") return "tax";
  if (k === "fee" || k === "service" || k === "tip" || k === "service_charge" || k === "xizmat") return "fee";
  return "item";
}

export function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f + (n < 0 ? -1e-9 : 1e-9)) / f;
}

function cleanName(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function nullableMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  return parseMoney(v);
}

/**
 * Turns the (untrusted) model output into clean data:
 * finite numbers, quantity >= 1, totalPrice = printed line total (unit price derived), discounts negative,
 * invalid lines dropped, and a `totalsMismatch` against the printed grand total.
 */
export function normalizeParsedReceipt(raw: any, opts: { fallbackCurrency?: string } = {}): NormalizedReceipt {
  const warnings: string[] = [];
  const rawSummary = raw?.summary ?? {};
  const currency =
    normalizeCurrencyCode(rawSummary?.currency) ??
    normalizeCurrencyCode(raw?.currency) ??
    opts.fallbackCurrency ??
    DEFAULT_CURRENCY;
  const dec = currencyDecimals(currency);

  const isReceipt = raw?.isReceipt !== false;
  const items: ParsedReceiptItem[] = [];
  const rawItems: any[] = Array.isArray(raw?.items) ? raw.items : [];

  rawItems.forEach((it, idx) => {
    const name = cleanName(it?.name);
    if (!name) {
      warnings.push(`line ${idx + 1}: empty name dropped`);
      return;
    }
    const kind = normalizeKind(it?.kind);
    let qty = parseMoney(it?.quantity);
    let unit = parseMoney(it?.unitPrice ?? it?.price);
    let total = parseMoney(it?.totalPrice ?? it?.total);

    if (qty === null || !(qty > 0)) qty = 1;
    if (total === null && unit === null) {
      warnings.push(`line ${idx + 1}: no price, dropped`);
      return;
    }
    if (total === null) total = (unit as number) * qty;
    if (kind === "discount") total = -Math.abs(total);
    else if (total < 0) {
      warnings.push(`line ${idx + 1}: negative price on a non-discount line, dropped`);
      return;
    }
    // quantity >= 1; fractional quantities (weights) become a single line
    if (qty < 1) qty = 1;
    // the printed line total is authoritative; the unit price is derived from it
    total = roundTo(total, dec);
    unit = kind === "discount" ? total : roundTo(total / qty, Math.max(dec, 2));
    items.push({ id: String(items.length + 1), name, unitPrice: unit, quantity: qty, totalPrice: total, kind });
  });

  const sum = (k: ParsedKind) => items.filter((i) => i.kind === k).reduce((s, i) => s + i.totalPrice, 0);
  const computed = roundTo(sum("item") + sum("fee") + sum("tax") + sum("discount"), dec);
  const grandTotal = nullableMoney(rawSummary?.grandTotal);
  const totalsMismatch = grandTotal === null ? null : roundTo(grandTotal - computed, dec);

  return {
    isReceipt,
    items,
    summary: {
      subtotal: nullableMoney(rawSummary?.subtotal),
      tax: nullableMoney(rawSummary?.tax),
      serviceFee: nullableMoney(rawSummary?.serviceFee),
      discount: nullableMoney(rawSummary?.discount),
      grandTotal,
      currency,
    },
    totalsMismatch,
    warnings,
  };
}
