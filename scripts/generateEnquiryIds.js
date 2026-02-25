/**
 * Standalone script to generate/convert enquiry_id to Enq-<5 digits> (e.g. Enq-12345).
 * Run manually if needed: node scripts/generateEnquiryIds.js
 * Also runs automatically on server startup (deploy). Converts old Enq-1234567890 to Enq-12345.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const {
  generateMissingEnquiryIds,
  validateAllEnquiryIds,
} = require("../src/utils/generateMissingEnquiryIds");

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
  console.log("🚀 Enquiry ID (Enq-12345) Generation Script");
  console.log("===============================================");

  try {
    await connectDB();

    console.log("\n📊 Current state:");
    await validateAllEnquiryIds();

    console.log("\n🔄 Assigning/converting enquiry_id to Enq-12345 format...");
    const result = await generateMissingEnquiryIds();

    console.log("\n📊 Final state:");
    await validateAllEnquiryIds();

    console.log("\n✅ Script completed successfully!");
    console.log(`   Updated: ${result.updated} / ${result.total} enquiries`);
    console.log("===============================================");
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
