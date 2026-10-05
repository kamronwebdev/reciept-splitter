/** Round to 2 decimal places (matches the finalize endpoint behavior). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Split `total` equally between `count` people. The last person receives the
 * remainder so that the shares always sum back to the (rounded) total.
 */
export function equalSplit(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }
  const ratio = 1 / count;
  let allocated = 0;
  const shares: number[] = [];
  for (let idx = 0; idx < count; idx++) {
    let share = total * ratio;
    if (idx === count - 1) share = total - allocated;
    share = round2(share);
    allocated = round2(allocated + share);
    shares.push(share);
  }
  return shares;
}
