/**
 * Benchmark Query Implementations
 * Logical query abstractions across Cypher (CognoDB, Neo4j, Memgraph) and AstraDB.
 */

// --- CYPHER WORKLOADS (CognoDB, Neo4j AuraDB, Memgraph Cloud) ---

export async function runCypherQuery(session, queryType, params = {}) {
  const start = performance.now();
  let result;

  switch (queryType) {
    case "1hop":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User {id: $id})-[:RELATION]->(m:User) RETURN count(m) AS neighborCount",
          { id: params.id }
        )
      );
      break;

    case "2hop":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User {id: $id})-[:RELATION*2]->(m:User) RETURN count(DISTINCT m) AS neighborCount",
          { id: params.id }
        )
      );
      break;

    case "3hop":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User {id: $id})-[:RELATION*3]->(m:User) RETURN count(DISTINCT m) AS neighborCount LIMIT 100",
          { id: params.id }
        )
      );
      break;

    case "pointLookup":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User {id: $id}) RETURN u.id, u.name, u.age, u.city",
          { id: params.id }
        )
      );
      break;

    case "indexedLookup":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User) WHERE u.city = $city AND u.age > $minAge RETURN u.id, u.name LIMIT 50",
          { city: params.city, minAge: params.minAge }
        )
      );
      break;

    case "aggregation":
      result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User) RETURN u.city AS city, count(u) AS count ORDER BY count DESC"
        )
      );
      break;

    case "singleWrite":
      result = await session.executeWrite((tx) =>
        tx.run(
          `CREATE (u:User {
            id: $id,
            numericId: $numericId,
            name: $name,
            age: $age,
            city: $city,
            createdAt: $createdAt
          })`,
          {
            id: params.id,
            numericId: params.numericId,
            name: params.name,
            age: params.age,
            city: params.city,
            createdAt: new Date().toISOString()
          }
        )
      );
      break;

    default:
      throw new Error(`Unknown Cypher query type: ${queryType}`);
  }

  const durationMs = performance.now() - start;
  return durationMs;
}

// --- ASTRADB WORKLOADS (DataAPIClient Document Graph Model) ---

export async function runAstraQuery(db, queryType, params = {}) {
  const start = performance.now();
  const usersCol = db.collection("users");
  const relsCol = db.collection("relationships");

  switch (queryType) {
    case "1hop": {
      const rels = await relsCol.find({ source: params.id }, { projection: { target: 1 } }).toArray();
      const targetIds = rels.map((r) => r.target);
      const count = targetIds.length;
      break;
    }

    case "2hop": {
      const rels1 = await relsCol.find({ source: params.id }, { projection: { target: 1 } }).toArray();
      const t1 = rels1.map((r) => r.target);
      let count = 0;
      if (t1.length > 0) {
        const rels2 = await relsCol.find({ source: { $in: t1 } }, { projection: { target: 1 } }).toArray();
        const t2 = new Set(rels2.map((r) => r.target));
        count = t2.size;
      }
      break;
    }

    case "3hop": {
      const rels1 = await relsCol.find({ source: params.id }, { projection: { target: 1 } }).toArray();
      const t1 = rels1.map((r) => r.target);
      if (t1.length > 0) {
        const rels2 = await relsCol.find({ source: { $in: t1 } }, { projection: { target: 1 } }).toArray();
        const t2 = Array.from(new Set(rels2.map((r) => r.target)));
        if (t2.length > 0) {
          const rels3 = await relsCol.find({ source: { $in: t2.slice(0, 50) } }, { limit: 100 }).toArray();
        }
      }
      break;
    }

    case "pointLookup": {
      const user = await usersCol.findOne({ _id: params.id });
      break;
    }

    case "indexedLookup": {
      const users = await usersCol.find({ city: params.city, age: { $gt: params.minAge } }, { limit: 50 }).toArray();
      break;
    }

    case "aggregation": {
      const cursor = await usersCol.find({}, { projection: { city: 1 } });
      const docs = await cursor.toArray();
      const cityCounts = {};
      for (const d of docs) {
        cityCounts[d.city] = (cityCounts[d.city] || 0) + 1;
      }
      break;
    }

    case "singleWrite": {
      await usersCol.insertOne({
        _id: params.id,
        numericId: params.numericId,
        name: params.name,
        age: params.age,
        city: params.city,
        createdAt: new Date().toISOString()
      });
      break;
    }

    default:
      throw new Error(`Unknown Astra query type: ${queryType}`);
  }

  const durationMs = performance.now() - start;
  return durationMs;
}
