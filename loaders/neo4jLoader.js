import neo4j from "neo4j-driver";
import { chunkArray } from "../data/generator.js";

const BATCH_SIZE = 2500;

export async function loadNeo4jAura(dataset) {
  const uri = process.env.AURADB_URI;
  const username = process.env.AURADB_USER;
  const password = process.env.AURADB_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error("Missing Neo4j AuraDB environment variables");
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });

  console.log("\n🚀 [Neo4j AuraDB] Starting data loading process...");
  const startTime = Date.now();

  try {
    // 1. Clean existing graph
    console.log("🧹 [Neo4j AuraDB] Clearing old benchmark dataset...");
    await session.executeWrite((tx) =>
      tx.run("MATCH (n:User) DETACH DELETE n")
    );

    // 2. Create Indexes
    console.log("⚡ [Neo4j AuraDB] Creating indexes on id and city...");
    try {
      await session.executeWrite((tx) =>
        tx.run("CREATE INDEX user_id_idx IF NOT EXISTS FOR (u:User) ON (u.id)")
      );
      await session.executeWrite((tx) =>
        tx.run("CREATE INDEX user_city_idx IF NOT EXISTS FOR (u:User) ON (u.city)")
      );
    } catch (idxErr) {
      console.warn("⚠️ [Neo4j AuraDB] Index creation warning:", idxErr.message);
    }

    // 3. Load Nodes in Batches
    const nodeBatches = chunkArray(dataset.nodes, BATCH_SIZE);
    console.log(`📦 [Neo4j AuraDB] Ingesting ${dataset.nodes.length.toLocaleString()} nodes in ${nodeBatches.length} batches...`);
    
    for (let i = 0; i < nodeBatches.length; i++) {
      const batch = nodeBatches[i];
      await session.executeWrite((tx) =>
        tx.run(
          `
          UNWIND $batch AS row
          CREATE (u:User {
            id: row.id,
            numericId: row.numericId,
            name: row.name,
            age: row.age,
            city: row.city,
            createdAt: row.createdAt
          })
          `,
          { batch }
        )
      );
    }

    // 4. Load Relationships in Batches
    const relBatches = chunkArray(dataset.relationships, BATCH_SIZE);
    console.log(`🔗 [Neo4j AuraDB] Ingesting ${dataset.relationships.length.toLocaleString()} relationships in ${relBatches.length} batches...`);

    for (let i = 0; i < relBatches.length; i++) {
      const batch = relBatches[i];
      await session.executeWrite((tx) =>
        tx.run(
          `
          UNWIND $batch AS row
          MATCH (a:User {id: row.source})
          MATCH (b:User {id: row.target})
          CREATE (a)-[r:RELATION {
            id: row.id,
            type: row.type,
            weight: row.weight,
            timestamp: row.timestamp
          }]->(b)
          `,
          { batch }
        )
      );
    }

    const durationMs = Date.now() - startTime;
    const nodesPerSec = Math.round((dataset.nodes.length / durationMs) * 1000);
    const relsPerSec = Math.round((dataset.relationships.length / durationMs) * 1000);

    console.log(`✅ [Neo4j AuraDB] Load complete in ${(durationMs / 1000).toFixed(2)}s (${nodesPerSec} nodes/sec, ${relsPerSec} rels/sec)`);

    return {
      database: "Neo4j AuraDB",
      nodeCount: dataset.nodes.length,
      relationshipCount: dataset.relationships.length,
      durationMs,
      durationSec: parseFloat((durationMs / 1000).toFixed(2)),
      nodesPerSec,
      relsPerSec,
      status: "SUCCESS"
    };
  } catch (err) {
    console.error("❌ [Neo4j AuraDB] Data loading failed:", err.message);
    throw err;
  } finally {
    await session.close();
    await driver.close();
  }
}
