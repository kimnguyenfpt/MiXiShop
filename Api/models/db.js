const { MongoClient } = require('mongodb');
const url = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = 'bookshop';

async function connectDb() {
  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  await client.connect();
  console.log('Connected successfully to server');
  return client.db(dbName);
}

module.exports = connectDb;
