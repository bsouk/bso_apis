/**
 * Standalone script to generate missing user IDs
 * Run this script manually if needed: node scripts/generateUserIds.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { generateMissingUserIds, validateAllUserIds } = require("../src/utils/generateMissingUserIds");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting User ID Generation Script...');
  console.log('=====================================');
  
  try {
    // Connect to database
    await connectDB();
    
    // Validate current state
    console.log('\n📊 Current Database State:');
    const validation = await validateAllUserIds();
    
    // Generate missing user IDs
    console.log('\n🔄 Generating missing user IDs...');
    const result = await generateMissingUserIds();
    
    // Final validation
    console.log('\n📊 Final Database State:');
    const finalValidation = await validateAllUserIds();
    
    console.log('\n✅ Script completed successfully!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
main();








