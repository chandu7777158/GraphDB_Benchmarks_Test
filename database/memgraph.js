import neo4j from "neo4j-driver";

const uri = process.env.MEMGRAPH_URI;
const username = process.env.MEMGRAPH_USER;
const password = process.env.MEMGRAPH_PASSWORD;
const databaseName = "Memgraph Cloud";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

async function verifyConnection(uriValue, authUser, authPassword, label) {
  requireEnv("MEMGRAPH_URI", uriValue);
  requireEnv("MEMGRAPH_USER", authUser);
  requireEnv("MEMGRAPH_PASSWORD", authPassword);

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

export async function verifyMemgraph() {
  return verifyConnection(uri, username, password, databaseName);
}
