const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/d79-directory';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// MongoDB client for NextAuth
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

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
      maxPoolSize: 50, // Increased from 10 to 50 to handle more concurrent connections
      minPoolSize: 5, // Maintain minimum pool size
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
module.exports.clientPromise = clientPromise;