const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Health check endpoint for quick runtime verification
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/v1', require('./routes/expenses')); // Keeps your old URL structure for expenses
app.use('/api/v1', require('./routes/categoryRoutes'));

app.listen(PORT, () => {
    console.log('You are listening to port:', PORT);
});
