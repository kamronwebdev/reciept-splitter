import { computeSplit, currencyDecimals, fromMinor, toMinor, type FeeMode, type LineKind, type SplitLine, type SplitResult } from './split';

export type DraftKind = 'item' | 'fee' | 'tax' | 'discount';

export interface DraftItem {
  id: string;
  name: string;
  kind: DraftKind;
  quantity: number;
  unitPrice: number;
  /** authoritative line total (major units; negative for discounts) */
  totalPrice: number;
  splitMode: 'equal' | 'count';
  assignedTo: string[];
  perPersonCount: Record<string, number>;
}

export function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f + (n < 0 ? -1e-9 : 1e-9)) / f;
}

/** total = unit price x quantity, rounded to the currency's minor unit */
export function lineTotal(unitPrice: number, quantity: number, currency: string): number {
  return roundTo(unitPrice * quantity, currencyDecimals(currency));
}

let counter = 0;
export function newItemId(prefix = 'm'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export function makeItem(partial: Partial<DraftItem> & { name: string }, currency: string): DraftItem {
  const quantity = partial.quantity && partial.quantity > 0 ? partial.quantity : 1;
  const unitPrice = partial.unitPrice ?? 0;
  const kind = partial.kind ?? 'item';
  const totalPrice = partial.totalPrice ?? lineTotal(unitPrice, quantity, currency);
  return {
    id: partial.id ?? newItemId(),
    name: partial.name,
    kind,
    quantity,
    unitPrice: kind === 'discount' ? totalPrice : unitPrice,
    totalPrice: kind === 'discount' ? -Math.abs(totalPrice) : totalPrice,
    splitMode: partial.splitMode ?? 'equal',
    assignedTo: partial.assignedTo ?? [],
    perPersonCount: partial.perPersonCount ?? {},
  };
}

export function toSplitLines(items: DraftItem[], currency: string): SplitLine[] {
  const dec = currencyDecimals(currency);
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind as LineKind,
    quantity: i.quantity,
    totalMinor: toMinor(i.totalPrice, dec),
    splitMode: i.splitMode,
    assignedTo: i.assignedTo,
    perPersonCount: i.perPersonCount,
  }));
}

export interface DraftTotals {
  itemsTotal: number;
  feesTotal: number;
  taxTotal: number;
  discountTotal: number; // negative or 0
  computedTotal: number;
}

export function draftTotals(items: DraftItem[], currency: string): DraftTotals {
  const dec = currencyDecimals(currency);
  const sum = (k: DraftKind) => items.filter((i) => i.kind === k).reduce((s, i) => s + toMinor(i.totalPrice, dec), 0);
  const itemsM = sum('item');
  const feesM = sum('fee');
  const taxM = sum('tax');
  const discM = sum('discount');
  return {
    itemsTotal: fromMinor(itemsM, dec),
    feesTotal: fromMinor(feesM, dec),
    taxTotal: fromMinor(taxM, dec),
    discountTotal: fromMinor(discM, dec),
    computedTotal: fromMinor(itemsM + feesM + taxM + discM, dec),
  };
}

/** receipt grand total - computed total, in major units (0 = consistent, null = receipt had no printed total) */
export function totalsDifference(receiptGrandTotal: number | null | undefined, computedTotal: number, currency: string): number | null {
  if (receiptGrandTotal === null || receiptGrandTotal === undefined) return null;
  return roundTo(receiptGrandTotal - computedTotal, currencyDecimals(currency));
}

export function runSplit(items: DraftItem[], participantIds: string[], currency: string, feeMode: FeeMode): SplitResult {
  return computeSplit(toSplitLines(items, currency), participantIds, feeMode);
}

/** Units still to hand out for a "by count" item. */
export function remainingUnits(item: DraftItem): number {
  const used = Object.values(item.perPersonCount).reduce((s, n) => s + (n || 0), 0);
  return item.quantity - used;
}
