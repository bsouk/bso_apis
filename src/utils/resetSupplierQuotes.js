/**
 * Utility script to reset supplier quotes to "not accepted" status for testing
 * Usage: node src/utils/resetSupplierQuotes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bso')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Define schemas inline for this utility
const EnquiryQuotesSchema = new mongoose.Schema({}, { strict: false });
const EnquirySchema = new mongoose.Schema({}, { strict: false });

const EnquiryQuotes = mongoose.model('EnquiryQuotes', EnquiryQuotesSchema, 'enquiryquotes');
const Enquiry = mongoose.model('Enquiry', EnquirySchema, 'enquiries');

const resetQuotes = async () => {
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Enquiry unique IDs to reset
  const enquiryUniqueIds = ['544973', '358300', '813892', '291006', '946409'];

  console.log('\n🔄 Resetting supplier quotes for enquiries:', enquiryUniqueIds);

  for (const uniqueId of enquiryUniqueIds) {
    try {
      // Find the enquiry by unique ID - try multiple formats
      let enquiry = await Enquiry.findOne({ enquiry_unique_id: uniqueId });
      
      // If not found, try with regex (partial match)
      if (!enquiry) {
        enquiry = await Enquiry.findOne({ 
          enquiry_unique_id: { $regex: uniqueId, $options: 'i' } 
        });
      }
      
      // If still not found, try as number
      if (!enquiry) {
        enquiry = await Enquiry.findOne({ enquiry_unique_id: parseInt(uniqueId) });
      }
      
      if (!enquiry) {
        // List some enquiries to debug
        const sample = await Enquiry.findOne({}).select('enquiry_unique_id');
        console.log(`⚠️  Enquiry #${uniqueId} not found. Sample ID format: ${sample?.enquiry_unique_id}`);
        continue;
      }

      console.log(`\n📋 Processing Enquiry #${uniqueId} (${enquiry._id})`);

      // Reset all supplier quotes for this enquiry
      const result = await EnquiryQuotes.updateMany(
        { enquiry_id: enquiry._id },
        { 
          $set: { 
            is_admin_approved: false,
            is_selected: false,
            is_admin_updated: false
          } 
        }
      );

      console.log(`   ✅ Reset ${result.modifiedCount} supplier quote(s)`);

      // Also reset the enquiry's selected_supplier if any
      await Enquiry.updateOne(
        { _id: enquiry._id },
        { 
          $unset: { selected_supplier: 1 }
        }
      );
      console.log(`   ✅ Cleared selected_supplier from enquiry`);

    } catch (error) {
      console.error(`❌ Error processing enquiry #${uniqueId}:`, error.message);
    }
  }

  console.log('\n✅ All quotes reset successfully!');
  console.log('You can now test accepting quotes again.\n');
  
  await mongoose.disconnect();
  console.log('📤 MongoDB disconnected');
};

resetQuotes().catch(console.error);

