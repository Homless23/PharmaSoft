const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// 1. Load & Validate Environment
dotenv.config();
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    logger.error(`FATAL: Environment variable ${env} is missing.`);
    process.exit(1);
  }
});

connectDB();

const app = express();

// 2. Security Middleware
app.use(helmet()); // Set secure HTTP headers
app.use(mongoSanitize()); // Sanitize MongoDB queries
app.use(express.json({ limit: '10kb' })); // Body limit to prevent DOS

// 3. Hardened CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-app.com'] 
    : function (origin, callback) {
        // Allow localhost with any port during development
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 4. Rate Limiting
//const limiter = rateLimit({
  //windowMs: 15 * 60 * 1000, // 15 minutes
  //max: 100, // Limit each IP to 100 requests per window
  //message: 'Too many requests from this IP, please try again later.'
//});
//app.use('/api/', limiter);

// 5. Routes
app.use('/api/auth', require('./routes/users'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budget', require('./routes/budget'));

// 6. Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.ip}`);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Fintech Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});