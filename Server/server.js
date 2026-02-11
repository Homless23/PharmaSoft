const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

// Route files
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Load env vars
dotenv.config();

// Validate Environment Variables
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'NODE_ENV'];
requiredEnv.forEach((env) => {
    if (!process.env[env]) {
        logger.error(`FATAL ERROR: ${env} is not defined in .env file.`);
        process.exit(1);
    }
});

// Connect to Database
connectDB();

const app = express();

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json({ limit: '10kb' }));

// --- ROUTES ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Production-ready API is live',
        uptime: process.uptime()
    });
});

// Centralized Error Handling (Must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful Shutdown
process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});