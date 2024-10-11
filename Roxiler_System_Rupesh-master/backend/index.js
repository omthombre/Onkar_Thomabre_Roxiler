import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const port = 3001;
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI; // Make sure to set this in your .env file
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(`Error connecting to MongoDB: ${err.message}`));

// Define the schema and model for sales data
const salesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  dateOfSale: { type: String, required: true },
  sold: { type: Boolean, required: true },
  category: { type: String, required: true }
});

const SalesData = mongoose.model('SalesData', salesSchema);

// Initialize Database API
app.get("/initialize", async (request, response) => {
  try {
    const apiUrl = "https://s3.amazonaws.com/roxiler.com/product_transaction.json";
    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    // Create sales data from fetched API data
    const salesData = data.map(item => ({
      title: item.title,
      description: item.description,
      price: item.price,
      dateOfSale: item.dateOfSale,
      sold: item.sold,
      category: item.category
    }));

    // Insert data into MongoDB
    await SalesData.insertMany(salesData);
    response.status(200).json({ message: "Database initialized successfully!" });
  } catch (error) {
    response.status(500).json({ message: "Error initializing database", error: error.message });
  }
});

// List Transactions API with Search and Pagination
app.get('/sales', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const startIndex = (page - 1) * limit;
  const limitInt = parseInt(limit, 10); 
  const pageInt = parseInt(page, 10); 

  try {
    // Fetch the total count of documents
    const totalCount = await SalesData.countDocuments();

    // Retrieve the specific page of data
    const data = await SalesData.find()
      .skip(startIndex)
      .limit(limitInt);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitInt);

    // Prepare the response
    res.json({
      data,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageInt,
        limit: limitInt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales data', error: error.message });
  }
});

// Statistics API
app.get("/statistics", async (request, response) => {
  try {
    const { month = 1 } = request.query;
    const data = await SalesData.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `^${month.toString().padStart(2, '0')}` }
        }
      },
      {
        $group: {
          _id: null,
          sales: { $sum: { $cond: [{ $eq: ["$sold", true] }, "$price", 0] } },
          soldItems: { $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] } },
          unSoldItems: { $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] } }
        }
      }
    ]);
    response.status(200).json(data[0]);
  } catch (error) {
    response.status(400).json({ message: "Error fetching statistics", error: error.message });
  }
});

// Item Price Range API
app.get("/items", async (request, response) => {
  try {
    const { month = 1 } = request.query;

    const data = await SalesData.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `^${month.toString().padStart(2, '0')}` }
        }
      },
      {
        $group: {
          _id: null,
          '0-100': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 0] }, { $lte: ["$price", 100] }] }, 1, 0] } },
          '101-200': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 101] }, { $lte: ["$price", 200] }] }, 1, 0] } },
          '201-300': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 201] }, { $lte: ["$price", 300] }] }, 1, 0] } },
          '301-400': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 301] }, { $lte: ["$price", 400] }] }, 1, 0] } },
          '401-500': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 401] }, { $lte: ["$price", 500] }] }, 1, 0] } },
          '501-above': { $sum: { $cond: [{ $gte: ["$price", 501] }, 1, 0] } }
        }
      }
    ]);

    response.status(200).json(data[0]);
  } catch (error) {
    response.status(400).json({ message: "Error fetching item price ranges", error: error.message });
  }
});

// Category Statistics API
app.get("/categories", async (request, response) => {
  try {
    const { month = 1 } = request.query;

    const data = await SalesData.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `^${month.toString().padStart(2, '0')}` }
        }
      },
      {
        $group: {
          _id: "$category",
          items: { $sum: 1 }
        }
      }
    ]);

    response.status(200).json(data);
  } catch (error) {
    response.status(400).json({ message: "Error fetching categories", error: error.message });
  }
});

// Bar Chart API
app.get("/price-range", async (request, response) => {
  try {
    const { month = 1 } = request.query;

    const data = await SalesData.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `^${month.toString().padStart(2, '0')}` }
        }
      },
      {
        $group: {
          _id: null,
          '0-100': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 0] }, { $lte: ["$price", 100] }] }, 1, 0] } },
          '101-200': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 101] }, { $lte: ["$price", 200] }] }, 1, 0] } },
          '201-300': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 201] }, { $lte: ["$price", 300] }] }, 1, 0] } },
          '301-400': { $sum: { $cond: [{ $and: [{ $gte: ["$price", 301] }, { $lte: ["$price", 400] }] }, 1, 0] } },
          '401-above': { $sum: { $cond: [{ $gte: ["$price", 401] }, 1, 0] } }
        }
      }
    ]);

    response.status(200).json(data[0]);
  } catch (error) {
    response.status(400).json({ message: "Error fetching price range data", error: error.message });
  }
});

// Combined Statistics API
app.get("/combined-statistics", async (request, response) => {
  try {
    const { month = 1 } = request.query;

    const stats = await SalesData.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `^${month.toString().padStart(2, '0')}` }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $cond: [{ $eq: ["$sold", true] }, "$price", 0] } },
          totalTransactions: { $sum: 1 },
          soldItems: { $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] } },
          unSoldItems: { $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] } }
        }
      }
    ]);

    response.status(200).json(stats[0]);
  } catch (error) {
    response.status(400).json({ message: "Error fetching combined statistics", error: error.message });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
