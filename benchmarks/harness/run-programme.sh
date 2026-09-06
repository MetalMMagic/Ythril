#!/bin/sh
# The remaining Tier 0-R programme, in one sequential pass.
#
# SEQUENTIAL and not parallel, for one reason: every rung rebuilds its spaces on the same instance, and two
# ingests racing each other change how long embedding takes without changing what is measured — which makes
# the `mean ms` column meaningless and, worse, makes a slow run look like a different result.
#
# Ordered by what each cell can teach, not by what it costs. The first three each change ONE thing about the
# best-scoring strategy so far; the last three are the shape sweep, which turns a defended single point into
# a curve anybody can read.
#
# Each cell writes its own directory, so a failure costs that cell and not the programme.
#
# Usage: run-programme.sh <base-url> <data> <out-root>
set -e
BASE="$1"; DATA="$2"; OUT="$3"
RUN="node /repo/benchmarks/harness/run-tier0r.mjs --base-url $BASE --data $DATA --questions 200 --max-chars 25000 --topk 60"

echo "=== 1/7  clean windows: the benchmark's bookkeeping out of the embedded text ===="
$RUN --rungs s0c --out "$OUT/s0c"

echo "=== 2/7  multi-scale windows, 3/1 and 9/3 over the same turns ==================="
$RUN --rungs s0m --out "$OUT/s0m"

echo "=== 3/7  full decomposition, walked ============================================"
$RUN --rungs s0f --traverse 2 --out "$OUT/s0f-hop2"

echo "=== 4/7  the same corpus, NOT walked — the control =============================="
$RUN --rungs s0f --traverse 0 --reuse-spaces --out "$OUT/s0f-hop0"

# The window-shape sweep. 5/2 is already measured and is the published shape; these are its neighbours, so
# the curve can be read rather than a single point defended.
echo "=== 5/7  windows 3/1 ==========================================================="
BENCH_WINDOW_SIZE=3 BENCH_WINDOW_STEP=1 $RUN --rungs s0w --out "$OUT/w3s1"

echo "=== 6/7  windows 10/4 =========================================================="
BENCH_WINDOW_SIZE=10 BENCH_WINDOW_STEP=4 $RUN --rungs s0w --out "$OUT/w10s4"

echo "=== 7/7  windows 15/6 =========================================================="
BENCH_WINDOW_SIZE=15 BENCH_WINDOW_STEP=6 $RUN --rungs s0w --out "$OUT/w15s6"

echo "PROGRAMME COMPLETE"
