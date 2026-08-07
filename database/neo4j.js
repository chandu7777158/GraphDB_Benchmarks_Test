import neo4j from "neo4j-driver";

const uri = process.env.AURADB_URI;
const username = process.env.AURADB_USER;
const password = process.env.AURADB_PASSWORD;
const databaseName = "Neo4j AuraDB";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

async function verifyConnection(uriValue, authUser, authPassword, label) {
  requireEnv("AURADB_URI", uriValue);
  requireEnv("AURADB_USER", authUser);
  requireEnv("AURADB_PASSWORD", authPassword);

  const driver = neo4j.driver(uriValue, neo4j.auth.basic(authUser, authPassword));
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    await driver.verifyConnectivity();
    const result = await session.executeRead((tx) => tx.run("RETURN timestamp() AS now"));
    const record = result.records[0];
    const now = record.get("now");
    console.log(`✅ ${label} connected successfully. Server timestamp: ${now.toString()}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

export async function verifyNeo4jAura() {
  return verifyConnection(uri, username, password, databaseName);
}
