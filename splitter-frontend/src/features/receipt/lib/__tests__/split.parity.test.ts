import { computeSplit, currencyDecimals, toMinor, type SplitLine } from '../split';
import cases from './split-cases.json';
import golden from './split-golden.json';
import { draftTotals, makeItem, totalsDifference, runSplit, remainingUnits } from '../draft';
import { formatMoney, parseAmountInput } from '../money';

describe('split parity with the backend (same fixtures, same golden totals)', () => {
  (cases as any[]).forEach((c, idx) => {
    it(c.name, () => {
      const dec = currencyDecimals(c.currency);
      const lines: SplitLine[] = c.lines.map((l: any) => ({ ...l, totalMinor: toMinor(l.total, dec) }));
      const r = computeSplit(lines, c.participants, c.feeMode);
      expect(r.people.map((p) => p.totalMinor)).toEqual((golden as number[][])[idx]);
      expect(r.people.reduce((s, p) => s + p.totalMinor, 0)).toBe(r.grandTotalMinor);
      expect(r.complete).toBe(true);
    });
  });
});

describe('draft helpers', () => {
  it('totals, difference and by-count remaining units', () => {
    const items = [
      makeItem({ id: '1', name: 'Plov', quantity: 2, unitPrice: 45000 }, 'UZS'),
      makeItem({ id: '2', name: 'Xizmat', kind: 'fee', totalPrice: 9000 }, 'UZS'),
      makeItem({ id: '3', name: 'Chegirma', kind: 'discount', totalPrice: 5000 }, 'UZS'),
    ];
    const t = draftTotals(items, 'UZS');
    expect(t.itemsTotal).toBe(90000);
    expect(t.discountTotal).toBe(-5000);
    expect(t.computedTotal).toBe(94000);
    expect(totalsDifference(94000, t.computedTotal, 'UZS')).toBe(0);
    expect(totalsDifference(100000, t.computedTotal, 'UZS')).toBe(6000);
    expect(totalsDifference(null, t.computedTotal, 'UZS')).toBeNull();
    const counted = { ...items[0]!, splitMode: 'count' as const, perPersonCount: { a: 1 } };
    expect(remainingUnits(counted)).toBe(1);
  });

  it('person totals add up to the receipt total (service fee proportional)', () => {
    const items = [
      { ...makeItem({ id: '1', name: 'A', unitPrice: 10001 }, 'UZS'), assignedTo: ['a', 'b', 'c'] },
      { ...makeItem({ id: '2', name: 'B', unitPrice: 5555 }, 'UZS'), assignedTo: ['a'] },
      makeItem({ id: 'F', name: 'Service', kind: 'fee', totalPrice: 1556 }, 'UZS'),
    ];
    const r = runSplit(items, ['a', 'b', 'c'], 'UZS', 'proportional');
    expect(r.people.reduce((s, p) => s + p.totalMinor, 0)).toBe(10001 + 5555 + 1556);
  });
});

describe('money formatting', () => {
  it('formats UZS with spaces and no decimals', () => {
    expect(formatMoney(45000, 'UZS')).toBe("45 000 so'm");
    expect(formatMoney(1234567, 'UZS', { withSymbol: false })).toBe('1 234 567');
  });
  it('formats cents and zero-decimal currencies', () => {
    expect(formatMoney(12.5, 'USD')).toBe('$12.50');
    expect(formatMoney(1500, 'JPY')).toBe('¥1 500');
    expect(formatMoney(-5000, 'UZS')).toBe("−5 000 so'm");
  });
  it('parses typed amounts', () => {
    expect(parseAmountInput('45 000')).toBe(45000);
    expect(parseAmountInput('12,5')).toBe(12.5);
    expect(parseAmountInput('')).toBeNull();
  });
});
