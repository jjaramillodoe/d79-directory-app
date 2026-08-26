const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/d79-directory';

// These ceilings are PER serverless instance, not per deployment, so the real connection
// count is this number times the number of warm instances. At 50 it took only ten warm
// instances to reach the 500-connection cap on Atlas M0/M2/M5, where exhaustion does not
// degrade gracefully -- new connections are refused outright. 10 leaves room for roughly
// 50 instances on the same tier. minPoolSize is 0 so idle instances hold nothing open;
// with maxIdleTimeMS below, a quiet deployment settles back to zero connections.
// Override via env when running on a tier that can afford more.
const MAX_POOL_SIZE = Number(process.env.MONGODB_MAX_POOL_SIZE) || 10;
const MIN_POOL_SIZE = Number(process.env.MONGODB_MIN_POOL_SIZE) || 0;

// Mongoose connection for app logic
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(retries = 3) {
  // Check if connection is already established and healthy
  if (cached.conn) {
    // Verify connection is still alive
    try {
      if (mongoose.connection.readyState === 1) {
        return cached.conn;
      } else {
        // Connection is not ready, reset it
        cached.conn = null;
        cached.promise = null;
      }
    } catch (e) {
      // Connection check failed, reset it
      cached.conn = null;
      cached.promise = null;
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout (increased)
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: MAX_POOL_SIZE,
      minPoolSize: MIN_POOL_SIZE,
      maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
      retryWrites: true,
      retryReads: true,
      // Connection pool monitoring
      waitQueueTimeoutMS: 10000, // Wait up to 10 seconds for a connection from the pool
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    
    // Retry logic for connection errors
    if (retries > 0 && (
      e.name === 'MongoNetworkError' || 
      e.name === 'MongoServerSelectionError' ||
      e.message?.includes('connection') ||
      e.message?.includes('timeout')
    )) {
      console.log(`Database connection failed, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return connectDB(retries - 1);
    }
    
    throw e;
  }
}

module.exports = connectDB;