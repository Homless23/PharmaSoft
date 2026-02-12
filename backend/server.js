const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/v1', require('./routes/expenses')); // Keeps your old URL structure for expenses

app.listen(PORT, () => {
    console.log('You are listening to port:', PORT);
});