import { runCypherQuery, runAstraQuery } from "./queries.js";

/**
 * Concurrency Sweep Runner for Mixed Read/Write Workloads
 * Tests client concurrency levels: 1, 10, 40 clients
 */

export async function runConcurrencySweep({
  dbType,
  driverOrDb,
  concurrencyLevel,
  durationMs = 5000,
  datasetSize = 10000
}) {
  console.log(` ⚡ [${dbType}] Running mixed workload concurrency sweep: ${concurrencyLevel} client(s) for ${durationMs / 1000}s...`);

  let writeCounter = 900000;
  const startTime = Date.now();
  let totalCompletedQueries = 0;
  let activeWorkers = concurrencyLevel;

  return new Promise((resolve) => {
    const isCypher = dbType !== "AstraDB";

    async function runWorker(workerId) {
      let session = null;
      if (isCypher) {
        session = driverOrDb.session({ defaultAccessMode: neo4j.session.WRITE });
      }

      try {
        while (Date.now() - startTime < durationMs) {
          const isRead = Math.random() < 0.8; // 80% Read / 20% Write
          const targetId = `user_${Math.floor(Math.random() * (datasetSize - 1)) + 1}`;

          if (isCypher) {
            if (isRead) {
              await runCypherQuery(session, "1hop", { id: targetId });
            } else {
              writeCounter++;
              await runCypherQuery(session, "singleWrite", {
                id: `user_write_${workerId}_${writeCounter}`,
                numericId: writeCounter,
                name: `Bench User ${writeCounter}`,
                age: 30,
                city: "Austin"
              });
            }
          } else {
            if (isRead) {
              await runAstraQuery(driverOrDb, "1hop", { id: targetId });
            } else {
              writeCounter++;
              await runAstraQuery(driverOrDb, "singleWrite", {
                id: `user_write_${workerId}_${writeCounter}`,
                numericId: writeCounter,
                name: `Bench User ${writeCounter}`,
                age: 30,
                city: "Austin"
              });
            }
          }
          totalCompletedQueries++;
        }
      } catch (err) {
        // Log worker error without breaking runner
      } finally {
        if (session) {
          try { await session.close(); } catch (e) {}
        }
        activeWorkers--;
        if (activeWorkers === 0) {
          const elapsedSec = (Date.now() - startTime) / 1000;
          const qps = parseFloat((totalCompletedQueries / elapsedSec).toFixed(2));
          console.log(`   👉 Concurrency ${concurrencyLevel} clients: ${qps} QPS (${totalCompletedQueries} queries in ${elapsedSec.toFixed(2)}s)`);
          resolve({
            concurrency: concurrencyLevel,
            totalQueries: totalCompletedQueries,
            elapsedSec: parseFloat(elapsedSec.toFixed(2)),
            qps
          });
        }
      }
    }

    for (let i = 0; i < concurrencyLevel; i++) {
      runWorker(i);
    }
  });
}
