/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const Payment = require('../src/models/payment');
const User = require('../src/models/user');
const { determinePaymentDetails, extractPaymentMethodDetails } = require('../src/controllers/user/paymentManagement');

const MONGO_URI = process.env.MONGODB_URI;

// Get user ID from environment (lines 110-111 in .env)
const TEST_USER_ID = process.env.TEST_USER_ID || process.env.SEED_USER_ID;

// Payment statuses
const STATUSES = ['completed', 'pending', 'failed', 'under_review'];

// Payment purposes
const PURPOSES = ['subscription', 'enquiry_payment', 'logistics_payment', 'team_member', 'subscription_renewal', 'other'];

// Payment features
const FEATURES = [
  'buyer_subscription',
  'supplier_subscription',
  'logistics_subscription',
  'recruiter_subscription',
  'enquiry_purchase',
  'order_payment',
  'logistics_fee',
  'team_expansion',
  'other'
];

// User types
const USER_TYPES = ['buyer', 'supplier', 'logistics', 'recruiter'];

// Payment methods
const PAYMENT_METHODS = ['card', 'bank_transfer', 'apple_iap', 'google_iap', 'cash-on-delivery'];

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

async function seedPayments({ useExistingConnection = false, logger = console } = {}) {
  if (!useExistingConnection && !MONGO_URI) {
    throw new Error('❌ MONGODB_URI is not defined in the environment variables.');
  }

  if (!TEST_USER_ID) {
    throw new Error('❌ TEST_USER_ID or SEED_USER_ID is not defined in the environment variables.');
  }

  let connectedHere = false;

  try {
    if (!useExistingConnection) {
      await mongoose.connect(MONGO_URI);
      connectedHere = true;
      logger.log('✅ Connected to MongoDB');
    } else if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      });
    }

    // Verify user exists
    const user = await User.findById(TEST_USER_ID);
    if (!user) {
      throw new Error(`❌ User with ID ${TEST_USER_ID} not found.`);
    }

    logger.log(`✅ Found user: ${user.email || user.full_name || TEST_USER_ID}`);

    // Determine if user is buyer or supplier
    const isBuyer = user.user_type?.includes('buyer') || user.current_user_type === 'buyer';
    const isSupplier = user.user_type?.includes('supplier') || user.current_user_type === 'supplier';
    const isLogistics = user.user_type?.includes('logistics') || user.current_user_type === 'logistics';
    const isRecruiter = user.user_type?.includes('recruiter') || user.current_user_type === 'recruiter';

    const userType = user.current_user_type || user.user_type?.[0] || 'buyer';

    logger.log(`📝 Creating 15+ payments for user type: ${userType}`);

    const paymentsToCreate = [];
    const numPayments = 18; // Create 18 payments for variety

    for (let i = 0; i < numPayments; i++) {
      const paymentStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const paymentPurpose = PURPOSES[Math.floor(Math.random() * PURPOSES.length)];
      const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
      
      // Select appropriate feature based on purpose and user type
      let paymentFeature = 'other';
      if (paymentPurpose === 'subscription' || paymentPurpose === 'subscription_renewal') {
        if (isBuyer) paymentFeature = 'buyer_subscription';
        else if (isSupplier) paymentFeature = 'supplier_subscription';
        else if (isLogistics) paymentFeature = 'logistics_subscription';
        else if (isRecruiter) paymentFeature = 'recruiter_subscription';
      } else if (paymentPurpose === 'enquiry_payment') {
        paymentFeature = isBuyer ? 'enquiry_purchase' : 'order_payment';
      } else if (paymentPurpose === 'logistics_payment') {
        paymentFeature = 'logistics_fee';
      } else if (paymentPurpose === 'team_member') {
        paymentFeature = 'team_expansion';
      }

      const totalAmount = getRandomAmount();
      const serviceCharges = Math.round((totalAmount * 0.05) * 100) / 100; // 5% service charge
      const createdAt = getRandomDate();

      // Build payment object
      const paymentData = {
        total_amount: totalAmount,
        currency: 'USD',
        payment_status: paymentStatus,
        payment_method_type: paymentMethod,
        payment_purpose: paymentPurpose,
        payment_feature: paymentFeature,
        user_type: userType,
        service_charges: serviceCharges,
        createdAt: createdAt,
        updatedAt: createdAt,
      };

      // Set buyer_id or supplier_id based on user type
      if (isBuyer) {
        paymentData.buyer_id = TEST_USER_ID;
      } else if (isSupplier) {
        paymentData.supplier_id = TEST_USER_ID;
      } else if (isLogistics) {
        paymentData.buyer_id = TEST_USER_ID; // Logistics can also be buyers
      } else {
        paymentData.buyer_id = TEST_USER_ID; // Default to buyer
      }

      // Add payment method details
      if (paymentMethod === 'card') {
        paymentData.payment_method_details = generateCardDetails();
        paymentData.stripe_payment_intent = `pi_${Math.random().toString(36).substring(2, 15)}`;
        paymentData.stripe_payment_method_id = `pm_${Math.random().toString(36).substring(2, 15)}`;
      } else if (paymentMethod === 'bank_transfer') {
        paymentData.payment_method_details = {
          transaction_id: generateTransactionId(),
          bank_name: 'Test Bank',
          bank_account_last4: String(Math.floor(Math.random() * 9000) + 1000)
        };
      } else {
        paymentData.payment_method_details = {
          transaction_id: generateTransactionId()
        };
      }

      // Add purpose details
      paymentData.purpose_details = {
        description: `Payment for ${paymentPurpose.replace('_', ' ')} - ${paymentFeature.replace('_', ' ')}`
      };

      // Add unique IDs based on purpose
      if (paymentPurpose === 'enquiry_payment') {
        paymentData.purpose_details.enquiry_unique_id = `ENQ${Date.now()}${i}`;
      } else if (paymentPurpose === 'subscription' || paymentPurpose === 'subscription_renewal') {
        paymentData.purpose_details.subscription_id = `SUB${Date.now()}${i}`;
        paymentData.purpose_details.plan_name = `${userType} Premium Plan`;
        paymentData.purpose_details.plan_type = userType;
      }

      // Add some payments with order_id simulation
      if (i % 3 === 0 && paymentPurpose === 'enquiry_payment') {
        paymentData.purpose_details.order_unique_id = `ORD${Date.now()}${i}`;
      }

      // Add logistic payment details for some payments
      if (paymentPurpose === 'logistics_payment' && i % 2 === 0) {
        paymentData.logistic_payment = [{
          currency: 'USD',
          payment_method: paymentMethod,
          amount: totalAmount * 0.8,
          payment_percentage: 80,
          schedule_status: paymentStatus === 'completed' ? 'completed' : 'pending',
          receipt_number: `REC${Date.now()}${i}`,
          txn_id: generateTransactionId()
        }];
        paymentData.logistics_charges = totalAmount * 0.8;
      }

      // Add payment stages for some payments
      if (i % 4 === 0 && paymentStatus === 'completed') {
        paymentData.payment_stage = [{
          currency: 'USD',
          payment_method: paymentMethod,
          amount: totalAmount,
          status: 'succeeded',
          schedule_id: `SCH${Date.now()}${i}`,
          txn_id: generateTransactionId(),
          receipt_number: `REC${Date.now()}${i}`
        }];
      }

      paymentsToCreate.push(paymentData);
    }

    // Insert payments
    const createdPayments = await Payment.insertMany(paymentsToCreate);
    logger.log(`✅ Created ${createdPayments.length} payments`);

    // Auto-populate fields for each payment (like production)
    logger.log('🔄 Auto-populating payment fields...');
    for (const payment of createdPayments) {
      try {
        // Re-fetch payment with all fields
        const fullPayment = await Payment.findById(payment._id);
        
        // Use the helper functions to determine and extract details
        const paymentDetails = await determinePaymentDetails(fullPayment);
        fullPayment.payment_purpose = paymentDetails.payment_purpose || fullPayment.payment_purpose;
        fullPayment.payment_feature = paymentDetails.payment_feature || fullPayment.payment_feature;
        fullPayment.user_type = paymentDetails.user_type || fullPayment.user_type;
        fullPayment.purpose_details = { ...fullPayment.purpose_details, ...paymentDetails.purpose_details };

        const methodDetails = await extractPaymentMethodDetails(fullPayment);
        if (methodDetails && Object.keys(methodDetails).length > 0) {
          fullPayment.payment_method_details = { ...fullPayment.payment_method_details, ...methodDetails };
        }

        await fullPayment.save();
      } catch (error) {
        logger.log(`⚠️  Warning: Could not auto-populate payment ${payment._id}: ${error.message}`);
      }
    }

    // Summary
    const statusCounts = {};
    const purposeCounts = {};
    const methodCounts = {};

    createdPayments.forEach(payment => {
      statusCounts[payment.payment_status] = (statusCounts[payment.payment_status] || 0) + 1;
      purposeCounts[payment.payment_purpose] = (purposeCounts[payment.payment_purpose] || 0) + 1;
      methodCounts[payment.payment_method_type] = (methodCounts[payment.payment_method_type] || 0) + 1;
    });

    logger.log('\n📊 Payment Summary:');
    logger.log('Status Distribution:', statusCounts);
    logger.log('Purpose Distribution:', purposeCounts);
    logger.log('Method Distribution:', methodCounts);
    logger.log(`\n🎉 Payment seeding completed successfully!`);

  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    if (connectedHere) {
      await mongoose.disconnect();
      logger.log('🔌 Disconnected from MongoDB');
    }
  }
}

module.exports = seedPayments;

if (require.main === module) {
  seedPayments()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}





