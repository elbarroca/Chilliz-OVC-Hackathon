import { MongoClient } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGO_URI"');
}

const uri = process.env.MONGO_URI;
console.log(`[MongoDB] Attempting to connect with URI: "${uri}"`);

const options = {
  serverSelectionTimeoutMS: 5000, // Fail fast if server is not reachable
  appName: 'AlphaStakes-NextJS',
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Wrapper function to add detailed logging to the connection attempt
async function connectToDb() {
  try {
    const connectedClient = await client.connect();
    console.log('[MongoDB] Successfully established connection to the database.');
    return connectedClient;
  } catch (error) {
    console.error('[MongoDB] =================================================');
    console.error('[MongoDB] CRITICAL: FAILED TO CONNECT TO THE DATABASE.');
    console.error(`[MongoDB] URI used: ${uri}`);
    console.error(`[MongoDB] Error:`, error);
    console.error('[MongoDB] Please check the following:');
    console.error('1. The MONGO_URI in your .env file is correct (including password).');
    console.error('2. Your IP address is whitelisted if the database is on a cloud service.');
    console.error('3. The database server is running and accessible.');
    console.error('4. If your password contains special characters (like $), ensure they are properly URL-encoded.');
    console.error('[MongoDB] =================================================');
    // Re-throw the error to ensure the application fails as expected
    throw new Error('Failed to connect to MongoDB');
  }
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = connectToDb();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = connectToDb();
}

export default clientPromise;