import { test } from "node:test";
import assert from "node:assert/strict";
import { round2, equalSplit } from "../src/utils/money.js";

test("round2 rounds to two decimals", () => {
  assert.equal(round2(3.333333), 3.33);
  assert.equal(round2(2.675 + 0.001), 2.68);
  assert.equal(round2(10), 10);
});

test("equalSplit gives remainder to the last person", () => {
  assert.deepEqual(equalSplit(10, 3), [3.33, 3.33, 3.34]);
});

test("equalSplit shares always sum to the total", () => {
  for (const total of [0.01, 9.99, 10, 123.45, 1000.07]) {
    for (let n = 1; n <= 9; n++) {
      const sum = equalSplit(total, n).reduce((a, b) => round2(a + b), 0);
      assert.equal(sum, round2(total), `total=${total} n=${n}`);
    }
  }
});

test("equalSplit rejects invalid counts", () => {
  assert.throws(() => equalSplit(10, 0));
  assert.throws(() => equalSplit(10, 1.5));
});
