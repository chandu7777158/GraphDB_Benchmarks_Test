import { verifyCognoDB } from "./cognodb.js";
import { verifyNeo4jAura } from "./neo4j.js";
import { verifyMemgraph } from "./memgraph.js";
import { verifyFalkorDB } from "./falkordb.js";
import { verifyAstraDB } from "./astra.js";

async function runAllVerifications() {
  const tasks = [
    { name: "CognoDB", action: verifyCognoDB },
    { name: "Neo4j AuraDB", action: verifyNeo4jAura },
    { name: "Memgraph Cloud", action: verifyMemgraph },
    { name: "FalkorDB", action: verifyFalkorDB },
    { name: "AstraDB", action: verifyAstraDB },
  ];

  for (const task of tasks) {
    try {
      await task.action();
    } catch (error) {
      console.error(`❌ ${task.name} verification failed:`, error.message || error);
    }
  }
}

runAllVerifications().catch((error) => {
  console.error("❌ Benchmark runner failed:", error);
  process.exit(1);
});
