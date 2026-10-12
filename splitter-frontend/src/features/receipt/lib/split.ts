/**
 * Bill splitting in INTEGER MINOR UNITS (no floating point drift).
 *
 * IMPORTANT: mirror of splitter-backend/src/utils/split.ts. Both sides are tested against the same
 * fixtures (split-cases.json / split-golden.json) so the app preview and /sessions/finalize agree to the cent.
 * Keep the two files in sync.
 */

export type LineKind = "item" | "fee" | "tax" | "tip" | "discount";
export type SplitMode = "equal" | "count";
export type FeeMode = "proportional" | "equal";

export interface SplitLine {
  id: string;
  name: string;
  kind: LineKind;
  quantity: number;
  /** authoritative line total in minor units (negative for discounts) */
  totalMinor: number;
  splitMode: SplitMode;
  assignedTo: string[];
  perPersonCount: Record<string, number>;
}

export interface PersonResult {
  uniqueId: string;
  itemsMinor: number;
  feesMinor: number;
  totalMinor: number;
  lines: { lineId: string; name: string; kind: LineKind; amountMinor: number; units?: number }[];
}

export interface SplitResult {
  people: PersonResult[];
  /** sum of item lines nobody has been assigned to yet */
  unassignedMinor: number;
  itemsTotalMinor: number;
  adjustmentsTotalMinor: number;
  grandTotalMinor: number;
  /** every purchased item is fully assigned */
  complete: boolean;
  /** itemIds whose assignment is missing or inconsistent (e.g. counts don't add up to the quantity) */
  incompleteItemIds: string[];
}

const ZERO_DECIMAL = new Set(["UZS", "JPY", "KRW", "VND", "CLP", "ISK", "PYG", "UGX", "XAF", "XOF"]);

export function currencyDecimals(code: string | null | undefined): number {
  return ZERO_DECIMAL.has((code || "").toUpperCase()) ? 0 : 2;
}

export function toMinor(amount: number, decimals: number): number {
  return Math.round(amount * 10 ** decimals + (amount < 0 ? -1e-9 : 1e-9));
}

export function fromMinor(minor: number, decimals: number): number {
  return decimals === 0 ? minor : Math.round(minor) / 10 ** decimals;
}

/** Even split; the first `remainder` ids get one extra minor unit. Handles negative totals (discounts). */
export function allocateEven(total: number, count: number): number[] {
  if (count <= 0) return [];
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / count);
  const rem = abs - base * count;
  return Array.from({ length: count }, (_, i) => sign * (base + (i < rem ? 1 : 0)));
}

/** Largest-remainder split proportional to integer weights (exact: BigInt). Ties go to the lower index. */
export function allocateWeighted(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const W = weights.reduce((s, w) => s + w, 0);
  if (W <= 0) return allocateEven(total, n);

  const sign = total < 0 ? -1 : 1;
  const A = BigInt(Math.abs(total));
  const BW = BigInt(W);
  const floors: bigint[] = [];
  const rems: bigint[] = [];
  let used = 0n;
  for (const w of weights) {
    const prod = A * BigInt(w);
    const f = prod / BW;
    floors.push(f);
    rems.push(prod % BW);
    used += f;
  }
  let left = Number(A - used);
  const order = rems
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  const out = floors.map((f) => Number(f));
  for (let k = 0; k < left; k++) {
    const slot = order[k % n]!.i;
    out[slot] = (out[slot] ?? 0) + 1;
  }
  return out.map((v) => sign * v);
}

export function computeSplit(
  lines: SplitLine[],
  participantIds: string[],
  feeMode: FeeMode = "proportional"
): SplitResult {
  const index = new Map(participantIds.map((id, i) => [id, i]));
  const people: PersonResult[] = participantIds.map((uniqueId) => ({
    uniqueId,
    itemsMinor: 0,
    feesMinor: 0,
    totalMinor: 0,
    lines: [],
  }));

  let unassignedMinor = 0;
  let itemsTotalMinor = 0;
  let adjustmentsTotalMinor = 0;
  const incomplete: string[] = [];

  // 1) purchased items
  for (const line of lines) {
    if (line.kind !== "item") continue;
    itemsTotalMinor += line.totalMinor;

    if (line.splitMode === "count") {
      const entries = participantIds
        .map((id) => ({ id, units: Math.max(0, Math.trunc(Number(line.perPersonCount?.[id]) || 0)) }))
        .filter((e) => e.units > 0);
      const sum = entries.reduce((s, e) => s + e.units, 0);
      if (entries.length === 0 || sum !== line.quantity) {
        unassignedMinor += line.totalMinor;
        incomplete.push(line.id);
        continue;
      }
      const amounts = allocateWeighted(line.totalMinor, entries.map((e) => e.units));
      entries.forEach((e, k) => {
        const p = people[index.get(e.id)!]!;
        p.itemsMinor += amounts[k]!;
        p.lines.push({ lineId: line.id, name: line.name, kind: line.kind, amountMinor: amounts[k]!, units: e.units });
      });
    } else {
      const assigned = participantIds.filter((id) => line.assignedTo.includes(id)); // canonical order
      if (assigned.length === 0) {
        unassignedMinor += line.totalMinor;
        incomplete.push(line.id);
        continue;
      }
      const amounts = allocateEven(line.totalMinor, assigned.length);
      assigned.forEach((id, k) => {
        const p = people[index.get(id)!]!;
        p.itemsMinor += amounts[k]!;
        p.lines.push({ lineId: line.id, name: line.name, kind: line.kind, amountMinor: amounts[k]! });
      });
    }
  }

  // 2) fees / tax / tip / discounts: proportional to each person's item subtotal (or equal)
  const weights = people.map((p) => Math.max(0, p.itemsMinor));
  for (const line of lines) {
    if (line.kind === "item") continue;
    adjustmentsTotalMinor += line.totalMinor;
    if (people.length === 0) continue;
    const amounts =
      feeMode === "equal"
        ? allocateEven(line.totalMinor, people.length)
        : allocateWeighted(line.totalMinor, weights);
    people.forEach((p, k) => {
      p.feesMinor += amounts[k]!;
      p.lines.push({ lineId: line.id, name: line.name, kind: line.kind, amountMinor: amounts[k]! });
    });
  }

  for (const p of people) p.totalMinor = p.itemsMinor + p.feesMinor;

  return {
    people,
    unassignedMinor,
    itemsTotalMinor,
    adjustmentsTotalMinor,
    grandTotalMinor: itemsTotalMinor + adjustmentsTotalMinor,
    complete: incomplete.length === 0,
    incompleteItemIds: incomplete,
  };
}
