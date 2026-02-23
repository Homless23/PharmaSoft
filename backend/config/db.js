const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        conn.connection.on('disconnected', () => {
            isConnected = false;
        });
        conn.connection.on('connected', () => {
            isConnected = true;
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
    } finally {
        isConnected = false;
    }
};

const getDbHealth = () => ({
    readyState: mongoose.connection.readyState,
    isConnected
});

module.exports = {
    connectDB,
    disconnectDB,
    getDbHealth
};
