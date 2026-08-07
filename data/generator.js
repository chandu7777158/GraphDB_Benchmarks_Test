/**
 * Deterministic Graph Dataset Generator
 * Generates 10,000 nodes and 100,000 relationships for reproducible benchmarking across graph databases.
 */

// Simple LCG pseudo-random number generator for deterministic reproducible data
function createPRNG(seed = 42) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const CITIES = [
  "New York", "San Francisco", "London", "Tokyo", "Berlin",
  "Toronto", "Sydney", "Singapore", "Paris", "Austin"
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Chris", "Pat", "Dakota",
  "Avery", "Peyton", "Quinn", "Skyler", "Reese", "Rowan", "Hayden", "Emerson", "Finley", "Harper"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
];

export function generateDataset(nodeCount = 10000, relationshipCount = 100000, seed = 2026) {
  const prng = createPRNG(seed);
  
  const getRandomInt = (min, max) => Math.floor(prng() * (max - min + 1)) + min;
  const getRandomChoice = (arr) => arr[Math.floor(prng() * arr.length)];

  console.log(`⚡ Generating deterministic graph dataset: ${nodeCount.toLocaleString()} nodes, ${relationshipCount.toLocaleString()} relationships...`);
  const startTime = Date.now();

  const nodes = [];
  for (let i = 1; i <= nodeCount; i++) {
    const firstName = getRandomChoice(FIRST_NAMES);
    const lastName = getRandomChoice(LAST_NAMES);
    nodes.push({
      id: `user_${i}`,
      numericId: i,
      name: `${firstName} ${lastName}`,
      age: getRandomInt(18, 65),
      city: getRandomChoice(CITIES),
      createdAt: new Date(1700000000000 + i * 10000).toISOString()
    });
  }

  const relationships = [];
  const edgeSet = new Set();
  
  let added = 0;
  while (added < relationshipCount) {
    const sourceId = getRandomInt(1, nodeCount);
    let targetId = getRandomInt(1, nodeCount);
    while (targetId === sourceId) {
      targetId = getRandomInt(1, nodeCount);
    }

    const edgeKey = `${sourceId}->${targetId}`;
    if (!edgeSet.has(edgeKey)) {
      edgeSet.add(edgeKey);
      relationships.push({
        id: `rel_${added + 1}`,
        source: `user_${sourceId}`,
        target: `user_${targetId}`,
        sourceNum: sourceId,
        targetNum: targetId,
        type: added % 3 === 0 ? "FOLLOWS" : "FRIEND_OF",
        weight: getRandomInt(1, 100),
        timestamp: new Date(1710000000000 + added * 5000).toISOString()
      });
      added++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`✅ Dataset generated in ${durationMs}ms.`);

  return { nodes, relationships };
}

export function chunkArray(array, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
