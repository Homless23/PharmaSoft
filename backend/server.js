const express = require('express')
const cors = require('cors');
const cookieParser = require('cookie-parser');
// Database connector (connects to MongoDB). File is at ./config/db.js
const connectDB = require('./config/db');
const { readdirSync } = require('fs')
const app = express()

require('dotenv').config()

const PORT = process.env.PORT || 5000

// CORS configuration - allow frontend origins and enable cookies
// In development the frontend may run on port 3000 or 3001; allow both
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [FRONTEND_URL, 'http://localhost:3001'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true // Allow cookies to be sent and received
}));

// Parse cookies on incoming requests (required to read the token cookie)
app.use(cookieParser());

app.use(express.json())

// Test route to verify server is up
app.get('/health', (req, res) => {
    console.log('[Server] Health check');
    res.json({ status: 'ok', message: 'Server is running' });
});

// Routes - dynamically load all route files from ./routes directory
const routeFiles = readdirSync('./routes');
console.log('Loading routes:', routeFiles);
routeFiles.forEach((route) => {
    console.log(`Loading /api/v1 route from ${route}`);
    app.use('/api/v1', require('./routes/' + route));
})

const server = () => {
    // Initialize DB connection
    connectDB();
    app.listen(PORT, () => {
        console.log('🚀 Server listening on port:', PORT)
        console.log('Routes loaded:', routeFiles);
    })
}

server()