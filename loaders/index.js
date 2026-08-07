import { generateDataset } from "../data/generator.js";
import { loadCognoDB } from "./cognodbLoader.js";
import { loadNeo4jAura } from "./neo4jLoader.js";
import { loadMemgraph } from "./memgraphLoader.js";
import { loadAstraDB } from "./astraLoader.js";

export async function runAllLoaders(nodeCount = 10000, relCount = 100000) {
  console.log("==================================================");
  console.log("📥 GRAPH DATABASE BENCHMARK - DATA LOADING STAGE");
  console.log("==================================================");

  const dataset = generateDataset(nodeCount, relCount);
  const results = [];

  const loaders = [
    { name: "CognoDB Cloud", fn: loadCognoDB },
    { name: "Neo4j AuraDB", fn: loadNeo4jAura },
    { name: "Memgraph Cloud", fn: loadMemgraph },
    { name: "AstraDB", fn: loadAstraDB }
  ];

  for (const loader of loaders) {
    try {
      const res = await loader.fn(dataset);
      results.push(res);
    } catch (error) {
      console.error(`❌ Data loading failed for ${loader.name}:`, error.message);
      results.push({
        database: loader.name,
        nodeCount,
        relationshipCount: relCount,
        durationMs: 0,
        durationSec: 0,
        nodesPerSec: 0,
        relsPerSec: 0,
        status: "FAILED",
        error: error.message
      });
    }
  }

  // Record FalkorDB status explicitly as requested by assignment & prompt
  results.push({
    database: "FalkorDB",
    nodeCount,
    relationshipCount: relCount,
    durationMs: null,
    durationSec: null,
    nodesPerSec: null,
    relsPerSec: null,
    status: "SKIPPED_EXPIRED",
    note: "Connection module implemented successfully, but benchmarking could not be completed because the free cloud instance expired before execution."
  });

  return { dataset, results };
}
