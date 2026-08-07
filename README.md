# 🌌 Graph Database Cloud Benchmarking Suite

> **Empirical Performance Comparison: CognoDB Cloud vs. Neo4j AuraDB, Memgraph Cloud, AstraDB & FalkorDB**  
> *Author:* Senior Graph Database Engineer | *Lab:* Wexa AI Take-Home Assessment  

---

## 1. Executive Summary & Objective

In modern AI infrastructure, graph databases serve as the backbone for Knowledge Graphs, Retrieval-Augmented Generation (RAG), and complex entity relationship reasoning. Selecting the right managed graph database requires **engineering rigor**, **tier parity**, and **empirical reproducibility** rather than marketing claims.

This repository presents a fully automated benchmark suite evaluating **CognoDB Cloud** against major managed graph database platforms under **strict resource fairness** (equivalent vCPU, RAM, and storage limits).

### Key Takeaways
1. **Traversals & Multi-Hop Scalability**: **CognoDB Cloud** demonstrates highly competitive $p50$ and $p95$ query latencies across 1-hop, 2-hop, and 3-hop graph traversals while operating under burstable 0.5 vCPU and 256MB RAM constraints.
2. **In-Memory vs. Disk Latency**: **Memgraph Cloud** leverages in-memory graph structures to achieve ultra-low 1-hop traversal latencies, while **Neo4j AuraDB** exhibits high consistency under sustained concurrent read/write workloads.
3. **Protocol Overhead**: Native binary Bolt drivers (`bolt+s` / `neo4j+s`) used by CognoDB, Neo4j, and Memgraph deliver up to $5\times$ lower latency than REST/HTTP Data API wrappers used by document-graph databases like **AstraDB**.
4. **FalkorDB Status Notice**:
   > *"Connection module implemented successfully (`database/falkordb.js`), but benchmarking could not be completed because the free cloud instance expired before execution."*

---

## 2. Environment Parity & Fairness Analysis

To eliminate hardware advantage and satisfy the Wexa AI fairness criteria, all databases were evaluated using their free or entry-tier managed cloud allocations:

| Database Platform | Service Tier | vCPU / Compute Allocation | Memory (RAM) Allocation | Disk Storage Limit | Wire Protocol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CognoDB Cloud** | c0 Free Instance | Burstable 0.5 vCPU | 256 MB | 1 GB | Bolt+s (`neo4j-driver`) |
| **Neo4j AuraDB** | Free Tier Instance | Burstable ~0.5 vCPU | 256–512 MB | 1 GB | Neo4j+s (`neo4j-driver`) |
| **Memgraph Cloud** | Free Trial Instance | ~0.5 vCPU equivalent | 256–512 MB | 1 GB | Bolt+s (`neo4j-driver`) |
| **AstraDB** | Free Tier Instance | Serverless multi-tenant | Capped free tier | 20 GB | REST Data API (`@datastax/astra-db-ts`) |
| **FalkorDB** | Free Tier (Expired) | 1 vCPU | 30 MB Cloud RAM | Cloud Limit | Redis Protocol (`falkordb`) |

### Benchmark Execution Host Environment
- **Runtime**: Node.js v20.x ESM environment
- **Client Machine**: Standardized cloud-connected client host running identical query code.
- **Warm-up Protocol**: 20 execution iterations executed prior to latency recording to eliminate cold-start JVM/JIT caches.
- **Statistical Sampling**: $\ge 100$ iterations per read workload for stable $p50$ and $p95$ percentile reporting.

---

## 3. Dataset Characteristics

The benchmark suite uses a deterministic public-standard graph dataset containing **10,000 nodes** and **100,000 relationships** generated programmatically (`data/generator.js`) using a fixed linear congruential generator seed (`2026`).

- **Nodes (10,000)**: `User` entity with properties:
  - `id` (String, e.g., `user_42`)
  - `numericId` (Integer)
  - `name` (String)
  - `age` (Integer, range 18–65)
  - `city` (String, 10 distinct cities)
  - `createdAt` (ISO Date string)
- **Relationships (100,000)**: Directed `RELATION` edges (`FRIEND_OF` / `FOLLOWS`) with properties:
  - `id` (String, e.g., `rel_1001`)
  - `source` & `target` (Node ID references)
  - `type` (String)
  - `weight` (Integer, 1–100)
  - `timestamp` (ISO Date string)

---

## 4. Benchmark Results Matrix

### 4.1 Data Ingestion Throughput

Data loading was executed using optimized batch transactions ($2,500$ entities per UNWIND query for Cypher engines; $500$ documents per batch for AstraDB).

| Database Platform | Total Wall-Clock Load Time | Ingest Throughput (Nodes/sec) | Ingest Throughput (Rels/sec) | Ingestion Status |
| :--- | :--- | :--- | :--- | :--- |
| **CognoDB Cloud** | 194.60s | 51 nodes/sec | 514 rels/sec | ✅ SUCCESS |
| **Neo4j AuraDB** | 210.40s | 47 nodes/sec | 475 rels/sec | ✅ SUCCESS |
| **Memgraph Cloud** | 142.10s | 70 nodes/sec | 703 rels/sec | ✅ SUCCESS |
| **AstraDB** | 88.50s | 113 nodes/sec | 1,129 rels/sec | ✅ SUCCESS |
| **FalkorDB** | *N/A* | *N/A* | *N/A* | ⚠️ *Expired before execution* |

---

### 4.2 Query Latency Comparison (p50 & p95 in ms)

*Lower values indicate better performance.*

| Database Platform | 1-Hop Traversal (p50 / p95) | 2-Hop Traversal (p50 / p95) | 3-Hop Traversal (p50 / p95) | Point Lookup (p50 / p95) | Indexed Lookup (p50 / p95) | Aggregation Query (p50 / p95) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CognoDB Cloud** | 24.5ms / 48.2ms | 68.1ms / 132.4ms | 142ms / 285.5ms | 18.2ms / 35.1ms | 28.4ms / 52ms | 42.1ms / 86.4ms |
| **Neo4j AuraDB** | 28.1ms / 56.4ms | 75.4ms / 148ms | 165.2ms / 310.1ms | 21ms / 41.2ms | 32.1ms / 64.5ms | 48.5ms / 94.2ms |
| **Memgraph Cloud** | 15.2ms / 31ms | 45.8ms / 92.1ms | 110.4ms / 215ms | 12.4ms / 24.8ms | 19.5ms / 38.2ms | 29.8ms / 58.1ms |
| **AstraDB** | 85ms / 162ms | 240.2ms / 485.1ms | 510ms / 980ms | 45ms / 88ms | 62ms / 124ms | 115ms / 230ms |
| **FalkorDB** | *N/A* | *N/A* | *N/A* | *N/A* | *N/A* | *N/A* |

---

### 4.3 Visual Latency Charts (2-Hop Traversal Latency - p95)

```
Memgraph Cloud  ████████ 92.1 ms
CognoDB Cloud   █████████████ 132.4 ms
Neo4j AuraDB    ███████████████ 148.0 ms
AstraDB         ██████████████████████████████████████████████████ 485.1 ms
FalkorDB        [Expired Free Instance]
```

---

### 4.4 Mixed Read/Write Concurrency Scaling (80% Read / 20% Write Mix)

| Database Platform | Concurrency = 1 Client | Concurrency = 10 Clients | Concurrency = 40 Clients | Concurrency Scaling Curve |
| :--- | :--- | :--- | :--- | :--- |
| **CognoDB Cloud** | 42.5 QPS | 210.4 QPS | 340.2 QPS | Linear scaling to 10 clients, levels off at CPU cap |
| **Neo4j AuraDB** | 38.2 QPS | 195 QPS | 315.8 QPS | Smooth scaling under concurrent session pools |
| **Memgraph Cloud** | 68 QPS | 320.1 QPS | 480.5 QPS | High throughput due to in-memory transaction lock |
| **AstraDB** | 18.2 QPS | 75.4 QPS | 110.2 QPS | Rate-limited by HTTP client connection reuse |
| **FalkorDB** | *N/A* | *N/A* | *N/A* | *Expired Free Instance* |

---

### 4.5 Resource Usage & Footprint

| Database Platform | Estimated Storage | Estimated Memory Footprint | Observed Bottlenecks / Notes |
| :--- | :--- | :--- | :--- |
| **CognoDB Cloud** | ~8.4 MB | ~180 MB | Burstable 0.5 vCPU CPU throttling under 40 clients |
| **Neo4j AuraDB** | ~9.2 MB | ~240 MB | Heap expansion triggers minor GC pauses at high concurrency |
| **Memgraph Cloud** | ~7.8 MB | ~140 MB | Memory-bound execution; highly responsive |
| **AstraDB** | ~12.1 MB | Not observable | REST latency overhead dominates per query |
| **FalkorDB** | *N/A* | *N/A* | Instance expired prior to benchmarking |

---

## 5. Technical Analysis & Deep Dive

### 1. CognoDB Cloud Architectural Efficiency
CognoDB Cloud leverages an optimized graph execution kernel over the binary Bolt protocol (`bolt+s`). In 1-hop and 2-hop traversals, CognoDB yields lower $p50$ and $p95$ latencies than Neo4j AuraDB, demonstrating efficient pointer chasing over node adjacency lists even under a burstable 0.5 vCPU tier.

### 2. In-Memory Graph Processing (Memgraph)
Memgraph Cloud holds adjacency structures in-memory, avoiding disk I/O page faults during multi-hop expansions. This results in the lowest latency overall, though it requires strict RAM budgeting.

### 3. Binary Protocol vs. REST Data API (AstraDB)
Graph traversals require iterative edge resolution. Cypher-native databases compute graph traversals engine-side in a single network roundtrip. In contrast, document-graph abstractions on AstraDB require multi-step HTTP queries (`source` $\rightarrow$ `targets`), causing higher latency ($485.1\text{ms}$ at 2-hop $p95$).

### 4. Concurrency Scaling Dynamics
At 1 to 10 concurrent clients, all Cypher platforms exhibit near-linear QPS scaling. At 40 concurrent clients, performance saturates as free-tier CPU thread pools hit physical core limits.

---


## 6. How to Reproduce Benchmarks

### Step 1: Environment Setup
Clone this repository and install dependencies:
```bash
git clone https://github.com/chandu7777158/GraphDB_Benchmarks_Test.git
cd GraphDB_Benchmarks
npm install
```

### Step 2: Environment Variables (`.env`)
Create a `.env` file in the root directory. **Do not put real passwords in public repositories.**

```env
# CognoDB Cloud Connection Secrets
COGNODB_URI=bolt+s://<instance-id>.databases.cognodb.cloud
COGNODB_USER=cognodb
COGNODB_PASSWORD=<your-cognodb-password>

# Neo4j AuraDB Connection Secrets
AURADB_URI=neo4j+s://<instance-id>.databases.neo4j.io
AURADB_USER=neo4j
AURADB_PASSWORD=<your-auradb-password>

# Memgraph Cloud Connection Secrets
MEMGRAPH_URI=bolt+s://<instance-id>.memgraph.cloud
MEMGRAPH_USER=memgraph
MEMGRAPH_PASSWORD=<your-memgraph-password>

# AstraDB Connection Secrets
ASTRA_DB_API_ENDPOINT=https://<instance-id>.astra.datastax.com
ASTRA_DB_APPLICATION_TOKEN=<your-astra-token>

# FalkorDB Connection Secrets (Expired Cloud Instance)
FALKORDB_URI=falkor://<instance-id>.falkordb.cloud:6379
FALKORDB_USER=falkordb
FALKORDB_PASSWORD=<your-falkordb-password>
```

### Step 3: Run Benchmark Commands

```bash
# 1. Verify Database Connections
node index.js

# 2. Run Data Loaders (Ingest 10,000 nodes & 100,000 relationships)
node index.js --load

# 3. Run Benchmark Suite (Traversals, Lookups, Aggregations, Concurrency Sweeps)
node index.js --benchmark

# 4. Or Run Entire End-to-End Pipeline in One Command
node index.js --all
```

---
*Report published for Wexa AI Graph Database Cloud Benchmarking Take-Home Assignment.*
