require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Use MONGO_URI instead of MONGODB_URI
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MongoDB URI is not defined in .env file');
  console.log('Please set MONGO_URI or MONGODB_URI in your .env file');
  process.exit(1);
}

console.log('🔍 Connecting to MongoDB...');

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🎮 GamersBD Server Started!          ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                           ║
║   Database: Connected ✅                ║
╚════════════════════════════════════════╝
      `);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });