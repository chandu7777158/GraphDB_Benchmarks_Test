import neo4j from "neo4j-driver";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { calculateStats } from "./stats.js";
import { runCypherQuery, runAstraQuery } from "./queries.js";
import { runConcurrencySweep } from "./concurrency.js";

const ITERATIONS = 100;
const WARMUP_COUNT = 20;
const CITIES = ["New York", "San Francisco", "London", "Tokyo", "Berlin"];

async function benchmarkCypherDatabase({ name, uri, username, password, nodeCount = 10000 }) {
  console.log(`\n==================================================`);
  console.log(`📊 BENCHMARKING: ${name}`);
  console.log(`==================================================`);

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  const benchmarkResults = {
    database: name,
    traversals: {},
    lookups: {},
    aggregations: {},
    mixedWorkload: {},
    footprint: {
      instanceSpecs: "Free Tier (burstable ~0.5 vCPU, 256MB RAM)",
      storageSize: "Not observable via cloud driver",
      memoryUsage: "Not observable via cloud driver"
    }
  };

  try {
    // 1. Warm-up phase
    console.log(`🔥 [${name}] Warming up database cache (${WARMUP_COUNT} queries)...`);
    for (let i = 0; i < WARMUP_COUNT; i++) {
      const randId = `user_${(i % nodeCount) + 1}`;
      await runCypherQuery(session, "1hop", { id: randId });
    }

    // 2. Traversal Benchmarks (1-hop, 2-hop, 3-hop)
    const hops = ["1hop", "2hop", "3hop"];
    for (const hop of hops) {
      console.log(`🏃 [${name}] Measuring ${hop} traversal (${ITERATIONS} iterations)...`);
      const latencies = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const randId = `user_${Math.floor(Math.random() * (nodeCount - 1)) + 1}`;
        const lat = await runCypherQuery(session, hop, { id: randId });
        latencies.push(lat);
      }
      benchmarkResults.traversals[hop] = calculateStats(latencies);
    }

    // 3. Lookup Benchmarks (Point Lookup & Indexed Lookup)
    console.log(`🔍 [${name}] Measuring point lookup (${ITERATIONS} iterations)...`);
    const pointLatencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const randId = `user_${Math.floor(Math.random() * (nodeCount - 1)) + 1}`;
      const lat = await runCypherQuery(session, "pointLookup", { id: randId });
      pointLatencies.push(lat);
    }
    benchmarkResults.lookups.pointLookup = calculateStats(pointLatencies);

    console.log(`🔍 [${name}] Measuring indexed lookup (${ITERATIONS} iterations)...`);
    const indexedLatencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const city = CITIES[i % CITIES.length];
      const lat = await runCypherQuery(session, "indexedLookup", { city, minAge: 30 });
      indexedLatencies.push(lat);
    }
    benchmarkResults.lookups.indexedLookup = {
      ...calculateStats(indexedLatencies),
      indexedProperties: ["id", "city"]
    };

    // 4. Aggregation Benchmark
    console.log(`📈 [${name}] Measuring aggregation query (${ITERATIONS} iterations)...`);
    const aggLatencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const lat = await runCypherQuery(session, "aggregation");
      aggLatencies.push(lat);
    }
    benchmarkResults.aggregations.groupByCity = calculateStats(aggLatencies);

    await session.close();

    // 5. Mixed Workload Concurrency Sweeps (1, 10, 40 clients)
    console.log(`🔀 [${name}] Running mixed read/write workload concurrency sweeps...`);
    const c1 = await runConcurrencySweep({ dbType: name, driverOrDb: driver, concurrencyLevel: 1, datasetSize: nodeCount });
    const c10 = await runConcurrencySweep({ dbType: name, driverOrDb: driver, concurrencyLevel: 10, datasetSize: nodeCount });
    const c40 = await runConcurrencySweep({ dbType: name, driverOrDb: driver, concurrencyLevel: 40, datasetSize: nodeCount });

    benchmarkResults.mixedWorkload = {
      concurrency1: c1.qps,
      concurrency10: c10.qps,
      concurrency40: c40.qps,
      readWriteMix: "80% Read / 20% Write"
    };

    return benchmarkResults;
  } finally {
    await driver.close();
  }
}

async function benchmarkAstraDB({ nodeCount = 10000 }) {
  const name = "AstraDB";
  console.log(`\n==================================================`);
  console.log(`📊 BENCHMARKING: ${name}`);
  console.log(`==================================================`);

  const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
  const token = process.env.ASTRA_DB_APPLICATION_TOKEN;

  if (!endpoint || !token) {
    throw new Error("Missing AstraDB credentials");
  }

  const client = new DataAPIClient();
  const db = client.db(endpoint, { token });

  const benchmarkResults = {
    database: name,
    traversals: {},
    lookups: {},
    aggregations: {},
    mixedWorkload: {},
    footprint: {
      instanceSpecs: "DataStax AstraDB Free Tier",
      storageSize: "Not observable via REST Data API",
      memoryUsage: "Not observable via REST Data API"
    }
  };

  // 1. Warm-up phase
  console.log(`🔥 [${name}] Warming up collection cache (${WARMUP_COUNT} queries)...`);
  for (let i = 0; i < WARMUP_COUNT; i++) {
    const randId = `user_${(i % nodeCount) + 1}`;
    await runAstraQuery(db, "1hop", { id: randId });
  }

  // 2. Traversals
  const hops = ["1hop", "2hop", "3hop"];
  for (const hop of hops) {
    console.log(`🏃 [${name}] Measuring ${hop} traversal (${ITERATIONS} iterations)...`);
    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const randId = `user_${Math.floor(Math.random() * (nodeCount - 1)) + 1}`;
      const lat = await runAstraQuery(db, hop, { id: randId });
      latencies.push(lat);
    }
    benchmarkResults.traversals[hop] = calculateStats(latencies);
  }

  // 3. Lookups
  console.log(`🔍 [${name}] Measuring point lookup (${ITERATIONS} iterations)...`);
  const pointLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const randId = `user_${Math.floor(Math.random() * (nodeCount - 1)) + 1}`;
    const lat = await runAstraQuery(db, "pointLookup", { id: randId });
    pointLatencies.push(lat);
  }
  benchmarkResults.lookups.pointLookup = calculateStats(pointLatencies);

  console.log(`🔍 [${name}] Measuring indexed lookup (${ITERATIONS} iterations)...`);
  const indexedLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const city = CITIES[i % CITIES.length];
    const lat = await runAstraQuery(db, "indexedLookup", { city, minAge: 30 });
    indexedLatencies.push(lat);
  }
  benchmarkResults.lookups.indexedLookup = {
    ...calculateStats(indexedLatencies),
    indexedProperties: ["_id", "city"]
  };

  // 4. Aggregation
  console.log(`📈 [${name}] Measuring aggregation query (${ITERATIONS} iterations)...`);
  const aggLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const lat = await runAstraQuery(db, "aggregation");
    aggLatencies.push(lat);
  }
  benchmarkResults.aggregations.groupByCity = calculateStats(aggLatencies);

  // 5. Concurrency Sweeps
  console.log(`🔀 [${name}] Running mixed read/write workload concurrency sweeps...`);
  const c1 = await runConcurrencySweep({ dbType: name, driverOrDb: db, concurrencyLevel: 1, datasetSize: nodeCount });
  const c10 = await runConcurrencySweep({ dbType: name, driverOrDb: db, concurrencyLevel: 10, datasetSize: nodeCount });
  const c40 = await runConcurrencySweep({ dbType: name, driverOrDb: db, concurrencyLevel: 40, datasetSize: nodeCount });

  benchmarkResults.mixedWorkload = {
    concurrency1: c1.qps,
    concurrency10: c10.qps,
    concurrency40: c40.qps,
    readWriteMix: "80% Read / 20% Write"
  };

  return benchmarkResults;
}

export async function runAllBenchmarks(nodeCount = 10000) {
  const allResults = [];

  // 1. CognoDB Cloud
  try {
    const cognoRes = await benchmarkCypherDatabase({
      name: "CognoDB Cloud",
      uri: process.env.COGNODB_URI,
      username: process.env.COGNODB_USER,
      password: process.env.COGNODB_PASSWORD,
      nodeCount
    });
    allResults.push(cognoRes);
  } catch (err) {
    console.error("❌ CognoDB benchmark failed:", err.message);
  }

  // 2. Neo4j AuraDB
  try {
    const neo4jRes = await benchmarkCypherDatabase({
      name: "Neo4j AuraDB",
      uri: process.env.AURADB_URI,
      username: process.env.AURADB_USER,
      password: process.env.AURADB_PASSWORD,
      nodeCount
    });
    allResults.push(neo4jRes);
  } catch (err) {
    console.error("❌ Neo4j AuraDB benchmark failed:", err.message);
  }

  // 3. Memgraph Cloud
  try {
    const memgraphRes = await benchmarkCypherDatabase({
      name: "Memgraph Cloud",
      uri: process.env.MEMGRAPH_URI,
      username: process.env.MEMGRAPH_USER,
      password: process.env.MEMGRAPH_PASSWORD,
      nodeCount
    });
    allResults.push(memgraphRes);
  } catch (err) {
    console.error("❌ Memgraph Cloud benchmark failed:", err.message);
  }

  // 4. AstraDB
  try {
    const astraRes = await benchmarkAstraDB({ nodeCount });
    allResults.push(astraRes);
  } catch (err) {
    console.error("❌ AstraDB benchmark failed:", err.message);
  }

  // 5. FalkorDB (Expired status)
  allResults.push({
    database: "FalkorDB",
    status: "EXPIRED",
    note: "Connection module implemented successfully, but benchmarking could not be completed because the free cloud instance expired before execution.",
    traversals: { "1hop": { p50: "N/A", p95: "N/A" }, "2hop": { p50: "N/A", p95: "N/A" }, "3hop": { p50: "N/A", p95: "N/A" } },
    lookups: { pointLookup: { p50: "N/A", p95: "N/A" }, indexedLookup: { p50: "N/A", p95: "N/A" } },
    aggregations: { groupByCity: { p50: "N/A", p95: "N/A" } },
    mixedWorkload: { concurrency1: "N/A", concurrency10: "N/A", concurrency40: "N/A" },
    footprint: { instanceSpecs: "FalkorDB Cloud Free Tier (Expired)", storageSize: "N/A", memoryUsage: "N/A" }
  });

  return allResults;
}
