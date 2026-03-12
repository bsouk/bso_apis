/**
 * Standalone script to convert pending enquiries to approved.
 * Run manually if needed: node scripts/approvePendingEnquiries.js
 * Also runs automatically on server startup (deploy).
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { autoApprovePendingEnquiries } = require("../src/utils/autoApprovePendingEnquiries");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log("🚀 Pending Enquiries Auto-Approval Script");
  console.log("=========================================");

  try {
    await connectDB();

    console.log("\n🔄 Converting pending enquiries to approved...");
    const result = await autoApprovePendingEnquiries();

    console.log("\n✅ Script completed successfully!");
    console.log(`   status_updated: ${result.statusUpdated}`);
    console.log(`   approval_flag_updated: ${result.approvalFlagUpdated}`);
    console.log(`   total_updated: ${result.totalUpdated}`);
    console.log("=========================================");
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

main();
