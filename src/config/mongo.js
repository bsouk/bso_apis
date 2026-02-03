const mongoose = require('mongoose')

/**
 * Initialize MongoDB connection. Returns a Promise that resolves when connected.
 * Call this first and await (or .then) before running any Mongoose operations.
 */
module.exports = () => {
  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
      throw error;
    }
  };

  mongoose.connection.on('error', console.log);
  mongoose.connection.on('disconnected', connect);

  return connect();
}