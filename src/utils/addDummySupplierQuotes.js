/**
 * Script to add dummy supplier quotes for testing
 * Run with: node src/utils/addDummySupplierQuotes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bso')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const EnquiryQuotes = require('../models/EnquiryQuotes');
const Enquiry = require('../models/Enquiry');
const User = require('../models/user');

const generateQuoteId = () => {
  return 'QT' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const addDummySupplierQuotes = async () => {
  try {
    // Find the enquiry with unique_id #813892
    const enquiry = await Enquiry.findOne({ enquiry_unique_id: '#813892' });
    
    if (!enquiry) {
      console.log('❌ Enquiry #813892 not found');
      console.log('Searching for available enquiries...');
      const enquiries = await Enquiry.find({}).limit(5).select('enquiry_unique_id _id');
      console.log('Available enquiries:', enquiries);
      return;
    }

    console.log('✅ Found enquiry:', enquiry._id, enquiry.enquiry_unique_id);

    // Find some suppliers
    const suppliers = await User.find({ 
      user_type: { $in: ['supplier'] },
      status: 'active'
    }).limit(3);

    if (suppliers.length === 0) {
      console.log('❌ No suppliers found');
      return;
    }

    console.log(`✅ Found ${suppliers.length} suppliers`);

    // Check if quotes already exist
    const existingQuotes = await EnquiryQuotes.countDocuments({ enquiry_id: enquiry._id, type: 'supplier' });
    if (existingQuotes > 0) {
      console.log(`ℹ️ ${existingQuotes} supplier quotes already exist for this enquiry`);
    }

    // Create 2 dummy supplier quotes
    const dummyQuotes = [
      {
        user_id: suppliers[0]?._id,
        enquiry_id: enquiry._id,
        quote_unique_id: generateQuoteId(),
        quotation_number: 'QTN-DEMO-001',
        delivery_time: '5-7 Business Days',
        additional_notes: 'Demo supplier quote 1 - Best quality products with fast delivery',
        currency: enquiry.currency || 'GBP',
        grand_total: 1500,
        enquiry_items: enquiry.enquiry_items?.map(item => ({
          brand: item.brand,
          part_no: item.part_no,
          description: item.description,
          quantity: item.quantity,
          available_quantity: item.quantity?.value || 10,
          unit_price: 150,
          amount: 150 * (item.quantity?.value || 10),
          condition: {
            status: 'new',
            new: true,
            reconditioned: false,
            used: false
          },
          manufacturer: {
            original: { selected: true },
            oem: { selected: false },
            aftermarket: { selected: false }
          }
        })) || [],
        custom_charges_one: {
          field_name: 'Shipping',
          value: 100
        },
        custom_charges_two: {
          field_name: 'Handling',
          charge_type: 'flat',
          value: 50
        },
        discount: {
          charge_type: 'flat',
          value: 0
        },
        is_selected: false,
        is_admin_approved: false,
        type: 'supplier',
        is_merged_quote: false
      },
      {
        user_id: suppliers[1]?._id || suppliers[0]?._id,
        enquiry_id: enquiry._id,
        quote_unique_id: generateQuoteId(),
        quotation_number: 'QTN-DEMO-002',
        delivery_time: '3-5 Business Days',
        additional_notes: 'Demo supplier quote 2 - Premium supplier with express delivery option',
        currency: enquiry.currency || 'GBP',
        grand_total: 1800,
        enquiry_items: enquiry.enquiry_items?.map(item => ({
          brand: item.brand,
          part_no: item.part_no,
          description: item.description,
          quantity: item.quantity,
          available_quantity: item.quantity?.value || 10,
          unit_price: 180,
          amount: 180 * (item.quantity?.value || 10),
          condition: {
            status: 'new',
            new: true,
            reconditioned: false,
            used: false
          },
          manufacturer: {
            original: { selected: false },
            oem: { selected: true, brand: 'OEM Brand', part_no: 'OEM-123' },
            aftermarket: { selected: false }
          }
        })) || [],
        custom_charges_one: {
          field_name: 'Shipping',
          value: 150
        },
        custom_charges_two: {
          field_name: 'Handling',
          charge_type: 'percentage',
          value: 5
        },
        discount: {
          charge_type: 'percentage',
          value: 10
        },
        is_selected: false,
        is_admin_approved: false,
        type: 'supplier',
        is_merged_quote: false
      }
    ];

    // Insert the quotes
    for (const quote of dummyQuotes) {
      const newQuote = new EnquiryQuotes(quote);
      await newQuote.save();
      console.log(`✅ Created supplier quote: ${newQuote.quote_unique_id}`);
    }

    console.log('\n✅ Successfully added 2 dummy supplier quotes for enquiry #813892');
    console.log('You can now view them in the admin panel at: /enquiry-detail/' + enquiry._id);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

addDummySupplierQuotes();

