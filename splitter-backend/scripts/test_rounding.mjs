// Simple test harness to validate client rounding matches server behavior
function round2(n) { return Math.round(n * 100) / 100; }

function equalSplit(unitTotal, participants) {
  const shareCount = participants.length;
  const ratio = 1 / shareCount;
  let allocated = 0;
  const allocations = [];
  participants.forEach((p, idx) => {
    let shareAmount;
    if (idx === participants.length - 1) {
      shareAmount = round2(unitTotal - allocated);
    } else {
      shareAmount = round2(unitTotal * ratio);
      allocated = round2(allocated + shareAmount);
    }
    allocations.push({ participant: p, shareAmount });
  });
  return allocations;
}

function test() {
  const participants = ['A','B','C'];
  const unitTotal = 10.0;
  const allocations = equalSplit(unitTotal, participants);
  console.log('Allocations:', allocations);
  const sum = allocations.reduce((s,a)=>s+a.shareAmount,0);
  console.log('Sum:', sum.toFixed(2));
}

test();
