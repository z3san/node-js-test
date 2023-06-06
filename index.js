require("dotenv").config();
const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.vzimcou.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());

// Set Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://vercel.live"
  );
  next();
});

app.get('/', (req, res) => {
  res.send("Holdinfo is running on 5000");
});

// Connect to MongoDB
const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Declare holdInfoCollection variable
let holdInfoCollection;

// Fetch data from the API and store the top 10 data in MongoDB
async function fetchData() {
  try {
    // Access holdInfoCollection
    holdInfoCollection = client.db("holdInfoCollection").collection("topTen");

    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const data = response.data;

    // Sort the data and get the top 10 entries
    const sortedData = Object.values(data).sort((a, b) => parseFloat(b.last) - parseFloat(a.last));
    const topTenData = sortedData.slice(0, 10).map(item => ({
      name: item.name,
      last: item.last,
      buy: item.buy,
      sell: item.sell,
      volume: item.volume,
      base_unit: item.base_unit
    }));

    await holdInfoCollection.deleteMany({});
    await holdInfoCollection.insertMany(topTenData);

    console.log('Top 10 data stored in MongoDB successfully');
  } catch (error) {
    console.error('Error storing top 10 data in MongoDB:', error);
  }
}

// Fetch and store the top 10 data on server startup
fetchData();

// Route to get the top 10 data from MongoDB
app.get('/topten', async (req, res) => {
  try {
    const result = await holdInfoCollection.find().toArray();
    res.json(result);
  } catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
