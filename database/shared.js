import neo4j from "neo4j-driver";

export function requireEnv(name, value, databaseName) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

export async function verifyNeo4jConnection({ uri, username, password, label }) {
  requireEnv(`${label.toUpperCase().replace(/\s+/g, "_")}_URI`, uri, label);
  requireEnv(`${label.toUpperCase().replace(/\s+/g, "_")}_USER`, username, label);
  requireEnv(`${label.toUpperCase().replace(/\s+/g, "_")}_PASSWORD`, password, label);

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
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
