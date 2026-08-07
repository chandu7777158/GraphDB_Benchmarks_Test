import FalkorDB from "falkordb";

const uri = process.env.FALKORDB_URI;
const username = process.env.FALKORDB_USER;
const password = process.env.FALKORDB_PASSWORD;
const databaseName = "FalkorDB";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

export async function verifyFalkorDB() {
  requireEnv("FALKORDB_URI", uri);
  requireEnv("FALKORDB_USER", username);
  requireEnv("FALKORDB_PASSWORD", password);

  try {
    const client = await FalkorDB.connect({ url: uri, password });
    const info = await client.info("server");
    console.log(`✅ ${databaseName} connected successfully. Server info: ${info}`);
    await client.close();
  } catch (error) {
    throw new Error(`FalkorDB verification failed: ${error.message || error}`);
  }
}
