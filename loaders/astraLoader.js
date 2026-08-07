import { DataAPIClient } from "@datastax/astra-db-ts";
import { chunkArray } from "../data/generator.js";

const BATCH_SIZE = 500;

export async function loadAstraDB(dataset) {
  const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
  const token = process.env.ASTRA_DB_APPLICATION_TOKEN;

  if (!endpoint || !token) {
    throw new Error("Missing AstraDB environment variables");
  }

  const client = new DataAPIClient();
  const db = client.db(endpoint, { token });

  console.log("\n🚀 [AstraDB] Starting data loading process...");
  const startTime = Date.now();

  try {
    // 1. Ensure collections exist
    console.log("🧹 [AstraDB] Preparing collections 'users' and 'relationships'...");
    
    let usersCol, relsCol;
    try {
      usersCol = await db.createCollection("users");
    } catch (e) {
      usersCol = db.collection("users");
    }

    try {
      relsCol = await db.createCollection("relationships");
    } catch (e) {
      relsCol = db.collection("relationships");
    }

    // Delete existing documents
    try {
      await usersCol.deleteMany({});
      await relsCol.deleteMany({});
    } catch (clearErr) {
      console.warn("⚠️ [AstraDB] Clear collections warning:", clearErr.message);
    }

    // 2. Load Nodes in Batches
    const nodeBatches = chunkArray(dataset.nodes, BATCH_SIZE);
    console.log(`📦 [AstraDB] Ingesting ${dataset.nodes.length.toLocaleString()} nodes in ${nodeBatches.length} batches...`);
    
    for (let i = 0; i < nodeBatches.length; i++) {
      const batch = nodeBatches[i].map(node => ({
        _id: node.id,
        numericId: node.numericId,
        name: node.name,
        age: node.age,
        city: node.city,
        createdAt: node.createdAt
      }));
      await usersCol.insertMany(batch);
    }

    // 3. Load Relationships in Batches
    const relBatches = chunkArray(dataset.relationships, BATCH_SIZE);
    console.log(`🔗 [AstraDB] Ingesting ${dataset.relationships.length.toLocaleString()} relationships in ${relBatches.length} batches...`);

    for (let i = 0; i < relBatches.length; i++) {
      const batch = relBatches[i].map(rel => ({
        _id: rel.id,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        weight: rel.weight,
        timestamp: rel.timestamp
      }));
      await relsCol.insertMany(batch);
    }

    const durationMs = Date.now() - startTime;
    const nodesPerSec = Math.round((dataset.nodes.length / durationMs) * 1000);
    const relsPerSec = Math.round((dataset.relationships.length / durationMs) * 1000);

    console.log(`✅ [AstraDB] Load complete in ${(durationMs / 1000).toFixed(2)}s (${nodesPerSec} nodes/sec, ${relsPerSec} rels/sec)`);

    return {
      database: "AstraDB",
      nodeCount: dataset.nodes.length,
      relationshipCount: dataset.relationships.length,
      durationMs,
      durationSec: parseFloat((durationMs / 1000).toFixed(2)),
      nodesPerSec,
      relsPerSec,
      status: "SUCCESS"
    };
  } catch (err) {
    console.error("❌ [AstraDB] Data loading failed:", err.message);
    throw err;
  }
}
