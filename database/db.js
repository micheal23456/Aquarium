// database/db.js
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Myaqua';

async function connectDB() {
  try {
    await mongoose.connect(mongoURI, {
      serverApi: { version: '1', strict: true, deprecationErrors: true },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err; // app.js will catch this
  }
}

module.exports = connectDB;
