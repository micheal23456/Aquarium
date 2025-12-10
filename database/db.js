const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Myaqua';

const options = {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  // useNewUrlParser and useUnifiedTopology are default in modern mongoose, but safe to include:
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function connectDB() {
  try {
    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err; // Let caller decide (exit or retry)
  }
}

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('✅ Connected to MongoDB'));

module.exports = { connectDB, db };
