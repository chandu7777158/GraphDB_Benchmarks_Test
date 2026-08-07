/**
 * Latency Percentile & Statistics Calculator
 */

export function calculateStats(latenciesMs) {
  if (!latenciesMs || latenciesMs.length === 0) {
    return { count: 0, p50: 0, p95: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const count = sorted.length;

  const getPercentile = (p) => {
    const idx = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.max(0, Math.min(idx, count - 1))];
  };

  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    count,
    p50: parseFloat(getPercentile(50).toFixed(2)),
    p95: parseFloat(getPercentile(95).toFixed(2)),
    min: parseFloat(sorted[0].toFixed(2)),
    max: parseFloat(sorted[count - 1].toFixed(2)),
    avg: parseFloat((sum / count).toFixed(2))
  };
}
