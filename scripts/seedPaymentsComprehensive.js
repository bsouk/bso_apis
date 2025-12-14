/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const Payment = require('../src/models/payment');
const User = require('../src/models/user');
const Enquiry = require('../src/models/Enquiry');
const Order = require('../src/models/order');
const Subscription = require('../src/models/subscription');
const { determinePaymentDetails, extractPaymentMethodDetails } = require('../src/controllers/user/paymentManagement');

const MONGO_URI = process.env.MONGODB_URI || process.env.DB_URL;

// Payment statuses
const STATUSES = ['completed', 'pending', 'failed', 'under_review'];

// Payment purposes with their corresponding features
const PAYMENT_SCENARIOS = [
  // Buyer payments
  { user_type: 'buyer', purpose: 'subscription', feature: 'buyer_subscription', method: 'card' },
  { user_type: 'buyer', purpose: 'subscription', feature: 'buyer_subscription', method: 'apple_iap' },
  { user_type: 'buyer', purpose: 'enquiry_payment', feature: 'enquiry_purchase', method: 'card' },
  { user_type: 'buyer', purpose: 'enquiry_payment', feature: 'enquiry_purchase', method: 'bank_transfer' },
  { user_type: 'buyer', purpose: 'logistics_payment', feature: 'logistics_fee', method: 'card' },
  { user_type: 'buyer', purpose: 'team_member', feature: 'team_expansion', method: 'card' },
  
  // Supplier payments
  { user_type: 'supplier', purpose: 'subscription', feature: 'supplier_subscription', method: 'card' },
  { user_type: 'supplier', purpose: 'subscription', feature: 'supplier_subscription', method: 'google_iap' },
  { user_type: 'supplier', purpose: 'enquiry_payment', feature: 'order_payment', method: 'card' },
  { user_type: 'supplier', purpose: 'enquiry_payment', feature: 'order_payment', method: 'bank_transfer' },
  { user_type: 'supplier', purpose: 'subscription_renewal', feature: 'supplier_subscription', method: 'card' },
  
  // Logistics payments
  { user_type: 'logistics', purpose: 'subscription', feature: 'logistics_subscription', method: 'card' },
  { user_type: 'logistics', purpose: 'logistics_payment', feature: 'logistics_fee', method: 'bank_transfer' },
  { user_type: 'logistics', purpose: 'enquiry_payment', feature: 'order_payment', method: 'card' },
  
  // Recruiter payments
  { user_type: 'recruiter', purpose: 'subscription', feature: 'recruiter_subscription', method: 'card' },
  { user_type: 'recruiter', purpose: 'team_member', feature: 'team_expansion', method: 'card' },
  { user_type: 'recruiter', purpose: 'subscription_renewal', feature: 'recruiter_subscription', method: 'apple_iap' },
  
  // Additional variety
  { user_type: 'buyer', purpose: 'other', feature: 'other', method: 'cash-on-delivery' },
  { user_type: 'supplier', purpose: 'other', feature: 'other', method: 'card' },
];

// Generate random date within last 6 months
const getRandomDate = () => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

// Generate random amount
const getRandomAmount = () => {
  return Math.round((Math.random() * 5000 + 10) * 100) / 100; // Between $10 and $5010
};

// Generate card details
const generateCardDetails = () => {
  const brands = ['Visa', 'Mastercard', 'American Express', 'Discover'];
  return {
    card_last4: String(Math.floor(Math.random() * 9000) + 1000),
    card_brand: brands[Math.floor(Math.random() * brands.length)],
    card_exp_month: Math.floor(Math.random() * 12) + 1,
    card_exp_year: new Date().getFullYear() + Math.floor(Math.random() * 5) + 1
  };
};

// Generate transaction ID
const generateTransactionId = () => {
  return `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
};

// Generate unique ID
const generateUniqueId = (prefix) => {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
};

async function seedPaymentsComprehensive() {
  if (!MONGO_URI) {
    throw new Error('❌ MONGODB_URI or DB_URL is not defined in the environment variables.');
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get primary user from .env (lines 110-111) if specified, otherwise use any active user
    const PRIMARY_USER_ID = process.env.TEST_USER_ID || process.env.SEED_USER_ID;
    let primaryUser = null;
    if (PRIMARY_USER_ID) {
      primaryUser = await User.findById(PRIMARY_USER_ID);
      if (primaryUser) {
        console.log(`✅ Using primary user from .env: ${primaryUser.email || primaryUser.full_name || PRIMARY_USER_ID}`);
      }
    }

    // Get users from database - one for each user type
    const buyers = await User.find({ 
      $or: [
        { user_type: { $in: ['buyer'] } },
        { current_user_type: 'buyer' }
      ],
      status: 'active'
    }).limit(10);
    
    const suppliers = await User.find({ 
      $or: [
        { user_type: { $in: ['supplier'] } },
        { current_user_type: 'supplier' }
      ],
      status: 'active'
    }).limit(10);
    
    const logistics = await User.find({ 
      $or: [
        { user_type: { $in: ['logistics'] } },
        { current_user_type: 'logistics' }
      ],
      status: 'active'
    }).limit(5);
    
    const recruiters = await User.find({ 
      $or: [
        { user_type: { $in: ['recruiter'] } },
        { current_user_type: 'recruiter' }
      ],
      status: 'active'
    }).limit(5);
    
    // If primary user exists, add it to the appropriate list
    if (primaryUser) {
      const isBuyer = primaryUser.user_type?.includes('buyer') || primaryUser.current_user_type === 'buyer';
      const isSupplier = primaryUser.user_type?.includes('supplier') || primaryUser.current_user_type === 'supplier';
      const isLogistics = primaryUser.user_type?.includes('logistics') || primaryUser.current_user_type === 'logistics';
      const isRecruiter = primaryUser.user_type?.includes('recruiter') || primaryUser.current_user_type === 'recruiter';
      
      if (isBuyer && !buyers.find(u => u._id.toString() === primaryUser._id.toString())) {
        buyers.unshift(primaryUser);
      } else if (isSupplier && !suppliers.find(u => u._id.toString() === primaryUser._id.toString())) {
        suppliers.unshift(primaryUser);
      } else if (isLogistics && !logistics.find(u => u._id.toString() === primaryUser._id.toString())) {
        logistics.unshift(primaryUser);
      } else if (isRecruiter && !recruiters.find(u => u._id.toString() === primaryUser._id.toString())) {
        recruiters.unshift(primaryUser);
      }
    }

    console.log(`📊 Found users:`);
    console.log(`   Buyers: ${buyers.length}`);
    console.log(`   Suppliers: ${suppliers.length}`);
    console.log(`   Logistics: ${logistics.length}`);
    console.log(`   Recruiters: ${recruiters.length}\n`);

    if (buyers.length === 0 && suppliers.length === 0 && logistics.length === 0 && recruiters.length === 0) {
      throw new Error('❌ No active users found in database. Please create users first.');
    }

    // Get some real enquiries and orders for realistic data
    const enquiries = await Enquiry.find({}).limit(10);
    const orders = await Order.find({}).limit(10);
    const subscriptions = await Subscription.find({}).limit(5);

    console.log(`📊 Found references:`);
    console.log(`   Enquiries: ${enquiries.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Subscriptions: ${subscriptions.length}\n`);

    const paymentsToCreate = [];
    let paymentIndex = 0;

    // Create payments for each scenario
    for (const scenario of PAYMENT_SCENARIOS) {
      // Select a user based on type
      let selectedUser;
      if (scenario.user_type === 'buyer' && buyers.length > 0) {
        selectedUser = buyers[paymentIndex % buyers.length];
      } else if (scenario.user_type === 'supplier' && suppliers.length > 0) {
        selectedUser = suppliers[paymentIndex % suppliers.length];
      } else if (scenario.user_type === 'logistics' && logistics.length > 0) {
        selectedUser = logistics[paymentIndex % logistics.length];
      } else if (scenario.user_type === 'recruiter' && recruiters.length > 0) {
        selectedUser = recruiters[paymentIndex % recruiters.length];
      } else {
        // Fallback to any available user
        if (buyers.length > 0) selectedUser = buyers[0];
        else if (suppliers.length > 0) selectedUser = suppliers[0];
        else if (logistics.length > 0) selectedUser = logistics[0];
        else if (recruiters.length > 0) selectedUser = recruiters[0];
        else continue;
      }

      if (!selectedUser) continue;

      const paymentStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const totalAmount = getRandomAmount();
      const serviceCharges = Math.round((totalAmount * 0.05) * 100) / 100; // 5% service charge
      const createdAt = getRandomDate();

      // Build payment object
      const paymentData = {
        total_amount: totalAmount,
        currency: 'USD',
        payment_status: paymentStatus,
        payment_method_type: scenario.method,
        payment_purpose: scenario.purpose,
        payment_feature: scenario.feature,
        user_type: scenario.user_type,
        service_charges: serviceCharges,
        createdAt: createdAt,
        updatedAt: createdAt,
        is_deleted: false,
        is_permanently_deleted: false,
      };

      // Set buyer_id or supplier_id based on user type
      if (scenario.user_type === 'buyer' || scenario.user_type === 'recruiter') {
        paymentData.buyer_id = selectedUser._id;
      } else if (scenario.user_type === 'supplier') {
        paymentData.supplier_id = selectedUser._id;
      } else if (scenario.user_type === 'logistics') {
        paymentData.buyer_id = selectedUser._id; // Logistics can also be buyers
      }

      // Add real references when available
      if (scenario.purpose === 'enquiry_payment' && enquiries.length > 0) {
        const enquiry = enquiries[paymentIndex % enquiries.length];
        paymentData.enquiry_id = enquiry._id;
        paymentData.purpose_details = {
          enquiry_unique_id: enquiry.enquiry_unique_id || generateUniqueId('ENQ'),
          description: `Payment for enquiry ${enquiry.enquiry_unique_id || enquiry._id}`
        };
      }

      if (scenario.purpose === 'enquiry_payment' && orders.length > 0 && paymentIndex % 2 === 0) {
        const order = orders[paymentIndex % orders.length];
        paymentData.order_id = order._id;
        if (paymentData.purpose_details) {
          paymentData.purpose_details.order_unique_id = order.order_unique_id || generateUniqueId('ORD');
        }
      }

      if ((scenario.purpose === 'subscription' || scenario.purpose === 'subscription_renewal') && subscriptions.length > 0) {
        const subscription = subscriptions[paymentIndex % subscriptions.length];
        paymentData.subscription_id = subscription._id;
        if (!paymentData.purpose_details) paymentData.purpose_details = {};
        paymentData.purpose_details.subscription_id = subscription._id.toString();
        paymentData.purpose_details.plan_name = `${scenario.user_type} Premium Plan`;
        paymentData.purpose_details.plan_type = scenario.user_type;
        paymentData.purpose_details.description = `Subscription payment for ${scenario.user_type}`;
      }

      // Add payment method details
      if (scenario.method === 'card') {
        paymentData.payment_method_details = generateCardDetails();
        paymentData.stripe_payment_intent = `pi_${Math.random().toString(36).substring(2, 15)}`;
        paymentData.stripe_payment_method_id = `pm_${Math.random().toString(36).substring(2, 15)}`;
        paymentData.stripe_customer_id = `cus_${Math.random().toString(36).substring(2, 15)}`;
      } else if (scenario.method === 'bank_transfer') {
        paymentData.payment_method_details = {
          transaction_id: generateTransactionId(),
          bank_name: ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank'][Math.floor(Math.random() * 4)],
          bank_account_last4: String(Math.floor(Math.random() * 9000) + 1000)
        };
      } else {
        paymentData.payment_method_details = {
          transaction_id: generateTransactionId()
        };
      }

      // Add purpose details if not already set
      if (!paymentData.purpose_details) {
        paymentData.purpose_details = {
          description: `Payment for ${scenario.purpose.replace('_', ' ')} - ${scenario.feature.replace('_', ' ')}`
        };
      }

      // Add logistic payment details for logistics payments
      if (scenario.purpose === 'logistics_payment' && paymentIndex % 2 === 0) {
        paymentData.logistic_payment = [{
          currency: 'USD',
          payment_method: scenario.method,
          amount: totalAmount * 0.8,
          payment_percentage: 80,
          schedule_status: paymentStatus === 'completed' ? 'completed' : 'pending',
          receipt_number: generateUniqueId('REC'),
          txn_id: generateTransactionId()
        }];
        paymentData.logistics_charges = totalAmount * 0.8;
      }

      // Add supplier charges for some payments
      if (scenario.user_type === 'buyer' && scenario.purpose === 'enquiry_payment' && paymentIndex % 3 === 0) {
        paymentData.supplier_charges = totalAmount * 0.7;
      }

      // Add payment stages for completed payments
      if (paymentStatus === 'completed' && paymentIndex % 3 === 0) {
        paymentData.payment_stage = [{
          currency: 'USD',
          payment_method: scenario.method,
          amount: totalAmount,
          status: 'succeeded',
          schedule_id: generateUniqueId('SCH'),
          txn_id: generateTransactionId(),
          receipt_number: generateUniqueId('REC')
        }];
      }

      paymentsToCreate.push(paymentData);
      paymentIndex++;
    }

    console.log(`📝 Creating ${paymentsToCreate.length} payments...\n`);

    // Insert payments
    const createdPayments = await Payment.insertMany(paymentsToCreate);
    console.log(`✅ Created ${createdPayments.length} payments`);

    // Auto-populate fields for each payment (like production)
    console.log('🔄 Auto-populating payment fields...');
    for (const payment of createdPayments) {
      try {
        // Re-fetch payment with all fields
        const fullPayment = await Payment.findById(payment._id);
        
        // Use the helper functions to determine and extract details
        const paymentDetails = await determinePaymentDetails(fullPayment);
        if (paymentDetails.payment_purpose) fullPayment.payment_purpose = paymentDetails.payment_purpose;
        if (paymentDetails.payment_feature) fullPayment.payment_feature = paymentDetails.payment_feature;
        if (paymentDetails.user_type) fullPayment.user_type = paymentDetails.user_type;
        if (paymentDetails.purpose_details) {
          fullPayment.purpose_details = { ...fullPayment.purpose_details, ...paymentDetails.purpose_details };
        }

        const methodDetails = await extractPaymentMethodDetails(fullPayment);
        if (methodDetails && Object.keys(methodDetails).length > 0) {
          fullPayment.payment_method_details = { ...fullPayment.payment_method_details, ...methodDetails };
        }

        await fullPayment.save();
      } catch (error) {
        console.log(`⚠️  Warning: Could not auto-populate payment ${payment._id}: ${error.message}`);
      }
    }

    // Summary
    const statusCounts = {};
    const purposeCounts = {};
    const methodCounts = {};
    const userTypeCounts = {};

    createdPayments.forEach(payment => {
      statusCounts[payment.payment_status] = (statusCounts[payment.payment_status] || 0) + 1;
      purposeCounts[payment.payment_purpose] = (purposeCounts[payment.payment_purpose] || 0) + 1;
      methodCounts[payment.payment_method_type] = (methodCounts[payment.payment_method_type] || 0) + 1;
      userTypeCounts[payment.user_type] = (userTypeCounts[payment.user_type] || 0) + 1;
    });

    console.log('\n📊 Payment Summary:');
    console.log('Status Distribution:', statusCounts);
    console.log('Purpose Distribution:', purposeCounts);
    console.log('Method Distribution:', methodCounts);
    console.log('User Type Distribution:', userTypeCounts);
    console.log(`\n🎉 Payment seeding completed successfully!`);
    console.log(`\n💡 You can now test the payment management filters with these payments.`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

module.exports = seedPaymentsComprehensive;

if (require.main === module) {
  seedPaymentsComprehensive()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

