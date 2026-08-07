import "dotenv/config";
import { runAllLoaders } from "./loaders/index.js";
import { runAllBenchmarks } from "./benchmarks/runner.js";
import { saveResultsToFile } from "./results/reporter.js";
import "./database/runner.js"; // Standard verification run on start

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "--verify";

  console.log("\n==================================================");
  console.log(`🚀 GRAPH DB BENCHMARK ENGINE (Mode: ${mode})`);
  console.log("==================================================\n");

  if (mode === "--load") {
    const { results: loadResults } = await runAllLoaders(10000, 100000);
    console.log("\n✅ Data loading phase completed.");
  } else if (mode === "--benchmark") {
    const benchResults = await runAllBenchmarks(10000);
    saveResultsToFile([], benchResults);
    console.log("\n✅ Benchmark phase completed.");
  } else if (mode === "--all") {
    console.log("1️⃣ Step 1: Loading Dataset across databases...");
    const { results: loadResults } = await runAllLoaders(10000, 100000);

    console.log("\n2️⃣ Step 2: Running Benchmark Suite...");
    const benchResults = await runAllBenchmarks(10000);

    console.log("\n3️⃣ Step 3: Saving Structured Results & Generating README...");
    saveResultsToFile(loadResults, benchResults);
    console.log("\n🎉 Full Benchmark Pipeline completed successfully!");
  } else {
    console.log("ℹ️ Database connection verification complete.");
    console.log("💡 Usage:");
    console.log("   node index.js --load       # Run bulk data loaders");
    console.log("   node index.js --benchmark  # Run latency and concurrency benchmarks");
    console.log("   node index.js --all        # Run load + benchmark + report generation pipeline");
  }
}

main().catch((err) => {
  console.error("❌ Execution error:", err);
  process.exit(1);
});
