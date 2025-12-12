/**
 * Script to reset is_admin_updated flag for testing Final Quote flow
 * Run with: node src/utils/resetFinalQuoteStatus.js <enquiry_id>
 * 
 * Example: node src/utils/resetFinalQuoteStatus.js 686b5a44f460469943e74963f
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bso')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const EnquiryQuotes = require('../models/EnquiryQuotes');
const AdminQuotes = require('../models/admin_quotes');
const Enquiry = require('../models/Enquiry');

const resetFinalQuoteStatus = async () => {
  try {
    const enquiryId = process.argv[2];
    
    if (!enquiryId) {
      // If no ID provided, list recent enquiries
      console.log('\n📋 No enquiry ID provided. Listing recent enquiries with is_admin_updated status:\n');
      
      const recentEnquiries = await Enquiry.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select('enquiry_unique_id _id createdAt');
      
      for (const enq of recentEnquiries) {
        const supplierQuotes = await EnquiryQuotes.find({ 
          enquiry_id: enq._id,
          is_admin_approved: true 
        }).select('is_admin_updated is_admin_approved');
        
        const adminQuote = await AdminQuotes.findOne({ enquiry_id: enq._id })
          .select('is_admin_updated');
        
        console.log(`📦 ${enq.enquiry_unique_id} (${enq._id})`);
        console.log(`   Created: ${enq.createdAt}`);
        console.log(`   Supplier Quotes (approved): ${supplierQuotes.length}`);
        if (supplierQuotes.length > 0) {
          supplierQuotes.forEach((sq, i) => {
            console.log(`     [${i}] is_admin_updated: ${sq.is_admin_updated}, is_admin_approved: ${sq.is_admin_approved}`);
          });
        }
        console.log(`   Admin Quote: ${adminQuote ? `is_admin_updated: ${adminQuote.is_admin_updated}` : 'None'}`);
        console.log('');
      }
      
      console.log('\n💡 Usage: node src/utils/resetFinalQuoteStatus.js <enquiry_id>');
      console.log('   Example: node src/utils/resetFinalQuoteStatus.js 686b5a44f460469943e74963f\n');
      return;
    }

    console.log(`\n🔍 Resetting Final Quote status for enquiry: ${enquiryId}\n`);

    // Find the enquiry
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) {
      console.log('❌ Enquiry not found');
      return;
    }
    console.log(`✅ Found enquiry: ${enquiry.enquiry_unique_id}`);

    // Reset supplier quotes
    const supplierQuoteResult = await EnquiryQuotes.updateMany(
      { enquiry_id: new mongoose.Types.ObjectId(enquiryId) },
      { $set: { is_admin_updated: false } }
    );
    console.log(`✅ Reset ${supplierQuoteResult.modifiedCount} supplier quote(s) - is_admin_updated: false`);

    // Reset admin quotes
    const adminQuoteResult = await AdminQuotes.updateMany(
      { enquiry_id: new mongoose.Types.ObjectId(enquiryId) },
      { $set: { is_admin_updated: false } }
    );
    console.log(`✅ Reset ${adminQuoteResult.modifiedCount} admin quote(s) - is_admin_updated: false`);

    // Show current status
    const supplierQuotes = await EnquiryQuotes.find({ 
      enquiry_id: new mongoose.Types.ObjectId(enquiryId),
      is_admin_approved: true 
    }).select('is_admin_updated is_admin_approved quote_unique_id');
    
    const adminQuote = await AdminQuotes.findOne({ 
      enquiry_id: new mongoose.Types.ObjectId(enquiryId) 
    }).select('is_admin_updated');

    console.log('\n📊 Current Status:');
    console.log(`   Approved Supplier Quotes: ${supplierQuotes.length}`);
    supplierQuotes.forEach((sq, i) => {
      console.log(`     [${i}] ${sq.quote_unique_id || sq._id}`);
      console.log(`         is_admin_approved: ${sq.is_admin_approved}`);
      console.log(`         is_admin_updated: ${sq.is_admin_updated}`);
    });
    console.log(`   Admin Quote: ${adminQuote ? `is_admin_updated: ${adminQuote.is_admin_updated}` : 'None'}`);

    console.log('\n✅ Reset complete! You can now test the Final Quote flow.');
    console.log(`   URL: http://localhost:3039/quoatation-final-quote/${enquiryId}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

resetFinalQuoteStatus();

















