import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { computeSplit, currencyDecimals, toMinor, fromMinor, allocateEven, allocateWeighted, type SplitLine } from "../src/utils/split.js";

const cases = JSON.parse(fs.readFileSync(new URL("./fixtures/split-cases.json", import.meta.url), "utf8"));

function run(c: any) {
  const dec = currencyDecimals(c.currency);
  const lines: SplitLine[] = c.lines.map((l: any) => ({ ...l, totalMinor: toMinor(l.total, dec) }));
  return { dec, lines, result: computeSplit(lines, c.participants, c.feeMode) };
}

test("allocators distribute exactly", () => {
  assert.deepEqual(allocateEven(10, 3), [4, 3, 3]);
  assert.deepEqual(allocateEven(-10, 3), [-4, -3, -3]);
  assert.deepEqual(allocateWeighted(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateWeighted(7, [0, 0]), [4, 3]);
  const parts = allocateWeighted(1_000_000_007, [123456789, 987654321, 5]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 1_000_000_007);
});

test("currency minor units", () => {
  assert.equal(currencyDecimals("UZS"), 0);
  assert.equal(currencyDecimals("usd"), 2);
  assert.equal(toMinor(19.99, 2), 1999);
  assert.equal(toMinor(0.1 + 0.2, 2), 30);
  assert.equal(fromMinor(1999, 2), 19.99);
});

for (const c of cases) {
  test(`split: ${c.name}`, () => {
    const { result } = run(c);
    // everything is assigned and the person totals add up to the receipt total exactly
    assert.equal(result.complete, true);
    assert.equal(result.people.reduce((s, p) => s + p.totalMinor, 0), result.grandTotalMinor);
    assert.equal(result.unassignedMinor, 0);
  });
}

test("print golden totals (used by the frontend parity test)", () => {
  const golden = cases.map((c: any) => run(c).result.people.map((p) => p.totalMinor));
  assert.deepEqual(golden, JSON.parse(fs.readFileSync(new URL("./fixtures/split-golden.json", import.meta.url), "utf8")));
});

test("unassigned and inconsistent count items are reported", () => {
  const lines: SplitLine[] = [
    { id: "1", name: "A", kind: "item", quantity: 2, totalMinor: 1000, splitMode: "count", assignedTo: [], perPersonCount: { a: 1 } },
    { id: "2", name: "B", kind: "item", quantity: 1, totalMinor: 500, splitMode: "equal", assignedTo: [], perPersonCount: {} },
  ];
  const r = computeSplit(lines, ["a", "b"]);
  assert.equal(r.complete, false);
  assert.deepEqual(r.incompleteItemIds, ["1", "2"]);
  assert.equal(r.unassignedMinor, 1500);
});
