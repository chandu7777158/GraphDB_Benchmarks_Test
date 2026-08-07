import neo4j from "neo4j-driver";

const uri = process.env.COGNODB_URI;
const username = process.env.COGNODB_USER;
const password = process.env.COGNODB_PASSWORD;
const databaseName = "CognoDB";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

async function verifyConnection(uriValue, authUser, authPassword, label) {
  requireEnv("COGNODB_URI", uriValue);
  requireEnv("COGNODB_USER", authUser);
  requireEnv("COGNODB_PASSWORD", authPassword);

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

export async function verifyCognoDB() {
  return verifyConnection(uri, username, password, databaseName);
}
