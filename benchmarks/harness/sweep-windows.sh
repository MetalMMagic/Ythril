#!/bin/sh
# Sweep the window shape at a FIXED answer budget.
#
# The design matters more than the loop. Two rules, both learned by getting them wrong first:
#
#   1. The BUDGET binds, not `topK`. The first equal-budget run compared 20 one-turn records (10 435 chars,
#      truncated on none of 199) against 20 ten-turn windows (24 138 chars, truncated on all of them) and
#      called it equal. `topK` is set high enough here that every configuration spends the same bytes and
#      the only variable left is the shape of a record.
#   2. Re-ingest per size. Windows of a different size are a different corpus, and the runner rebuilds the
#      space, so these run SEQUENTIALLY against one instance rather than in parallel.
#
# Usage: sweep-windows.sh <base-url> <data> <out-root> "<sizes>" "<steps>"
set -e
BASE="$1"; DATA="$2"; OUT="$3"; SIZES="$4"; STEPS="$5"

for pair in $SIZES; do
  size="${pair%%/*}"
  step="${pair##*/}"
  echo ""
  echo "=== window ${size} step ${step} ==============================="
  BENCH_WINDOW_SIZE="$size" BENCH_WINDOW_STEP="$step" \
    node /repo/benchmarks/harness/run-tier0r.mjs \
      --base-url "$BASE" --data "$DATA" --questions 200 --rungs s0w \
      --max-chars 25000 --topk 60 \
      --out "${OUT}/w${size}s${step}"
done
echo ""
echo "SWEEP COMPLETE"
