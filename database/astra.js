import { DataAPIClient } from "@datastax/astra-db-ts";

const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
const databaseName = "AstraDB";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name} for ${databaseName}`);
  }
}

export async function verifyAstraDB() {
  requireEnv("ASTRA_DB_API_ENDPOINT", endpoint);
  requireEnv("ASTRA_DB_APPLICATION_TOKEN", token);

  const client = new DataAPIClient();
  const db = client.db(endpoint, { token });

  try {
    const collections = await db.listCollections();
    console.log(`✅ ${databaseName} connected successfully. Collections count: ${collections.length}`);
  } catch (error) {
    throw new Error(`AstraDB verification failed: ${error.message || error}`);
  }
}
