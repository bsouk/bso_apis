/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const Payment = require('../src/models/payment');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGODB_URI;
const TEST_USER_ID = process.env.TEST_USER_ID || process.env.REACT_APP_TEST_USER_ID;

// Payment statuses
const paymentStatuses = ['completed', 'pending', 'failed', 'under_review'];
const userTypes = ['buyer', 'supplier', 'logistics', 'recruiter'];
const paymentPurposes = ['subscription', 'enquiry_payment', 'logistics_payment', 'team_member', 'subscription_renewal', 'other'];
const paymentFeatures = [
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
const paymentMethods = ['card', 'bank_transfer', 'apple_iap', 'google_iap', 'cash-on-delivery'];
const cardBrands = ['Visa', 'Mastercard', 'American Express', 'Discover'];
const currencies = ['USD', 'EUR', 'GBP'];

// Generate random date within last 6 months
const getRandomDate = () => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

// Generate random amount
const getRandomAmount = () => {
  return Math.round((Math.random() * 5000 + 50) * 100) / 100; // Between $50 and $5050
};

// Get random item from array
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Generate payment method details
const generatePaymentMethodDetails = (method) => {
  if (method === 'card') {
    return {
      card_last4: String(Math.floor(Math.random() * 9000) + 1000),
      card_brand: getRandomItem(cardBrands),
      card_exp_month: Math.floor(Math.random() * 12) + 1,
      card_exp_year: new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
      transaction_id: `txn_${Math.random().toString(36).substring(2, 15)}`
    };
  } else if (method === 'bank_transfer') {
    return {
      bank_name: getRandomItem(['Chase', 'Bank of America', 'Wells Fargo', 'Citibank']),
      bank_account_last4: String(Math.floor(Math.random() * 9000) + 1000),
      transaction_id: `bank_${Math.random().toString(36).substring(2, 15)}`
    };
  } else {
    return {
      transaction_id: `${method}_${Math.random().toString(36).substring(2, 15)}`
    };
  }
};

// Generate purpose details
const generatePurposeDetails = (purpose, feature) => {
  const details = {};
  
  if (purpose === 'subscription' || purpose === 'subscription_renewal') {
    details.subscription_id = `sub_${Math.random().toString(36).substring(2, 15)}`;
    details.plan_name = getRandomItem(['Basic Plan', 'Premium Plan', 'Enterprise Plan']);
    details.plan_type = getRandomItem(['monthly', 'yearly']);
  } else if (purpose === 'enquiry_payment') {
    details.enquiry_unique_id = `ENQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    details.description = 'Payment for enquiry purchase';
  } else if (purpose === 'logistics_payment') {
    details.order_unique_id = `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    details.description = 'Logistics fee payment';
  } else if (purpose === 'team_member') {
    details.description = 'Additional team member payment';
  }
  
  return details;
};

async function seedPayments({ useExistingConnection = false, logger = console } = {}) {
  if (!useExistingConnection && !MONGO_URI) {
    throw new Error('❌ MONGODB_URI is not defined in the environment variables.');
  }

  if (!TEST_USER_ID) {
    throw new Error('❌ TEST_USER_ID or REACT_APP_TEST_USER_ID is not defined in the environment variables.');
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
      throw new Error(`❌ User with ID ${TEST_USER_ID} not found. Please check your TEST_USER_ID in .env file.`);
    }

    logger.log(`✅ Found user: ${user.email || user.full_name || TEST_USER_ID}`);

    // Check if payments already exist for this user
    const existingPayments = await Payment.countDocuments({
      $or: [
        { buyer_id: new mongoose.Types.ObjectId(TEST_USER_ID) },
        { supplier_id: new mongoose.Types.ObjectId(TEST_USER_ID) }
      ]
    });

    if (existingPayments > 0) {
      logger.log(`ℹ️  Found ${existingPayments} existing payments for this user.`);
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        logger.log('ℹ️  Use --force flag to add more payments or delete existing ones first.');
        return;
      }
    }

    // Generate 15 payments
    const paymentsToCreate = [];
    const numPayments = 15;

    for (let i = 0; i < numPayments; i++) {
      const userType = getRandomItem(userTypes);
      const paymentPurpose = getRandomItem(paymentPurposes);
      const paymentFeature = getRandomItem(paymentFeatures);
      const paymentMethod = getRandomItem(paymentMethods);
      const paymentStatus = getRandomItem(paymentStatuses);
      const currency = getRandomItem(currencies);
      const totalAmount = getRandomAmount();
      const createdAt = getRandomDate();

      // Determine if buyer or supplier based on user type
      const isBuyer = userType === 'buyer' || (userType === 'supplier' && Math.random() > 0.5);

      const paymentData = {
        [isBuyer ? 'buyer_id' : 'supplier_id']: new mongoose.Types.ObjectId(TEST_USER_ID),
        total_amount: totalAmount,
        currency: currency.toLowerCase(),
        payment_status: paymentStatus,
        payment_method_type: paymentMethod,
        user_type: userType,
        payment_purpose: paymentPurpose,
        payment_feature: paymentFeature,
        payment_method_details: generatePaymentMethodDetails(paymentMethod),
        purpose_details: generatePurposeDetails(paymentPurpose, paymentFeature),
        service_charges: Math.round(totalAmount * 0.05 * 100) / 100,
        supplier_charges: isBuyer ? Math.round(totalAmount * 0.7 * 100) / 100 : 0,
        logistics_charges: Math.round(totalAmount * 0.1 * 100) / 100,
        stripe_customer_id: `cus_${Math.random().toString(36).substring(2, 15)}`,
        is_deleted: false,
        is_permanently_deleted: false,
        createdAt: createdAt,
        updatedAt: createdAt
      };

      // Add payment stages for some payments
      if (paymentStatus === 'completed' && Math.random() > 0.3) {
        paymentData.payment_stage = [
          {
            amount: totalAmount,
            currency: currency.toLowerCase(),
            payment_method: paymentMethod,
            status: 'succeeded',
            schedule_id: `sched_${Math.random().toString(36).substring(2, 15)}`,
            txn_id: paymentData.payment_method_details.transaction_id,
            receipt_number: `RCP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            schedule_status: 'completed'
          }
        ];
      } else if (paymentStatus === 'pending') {
        paymentData.payment_stage = [
          {
            amount: totalAmount,
            currency: currency.toLowerCase(),
            payment_method: paymentMethod,
            status: 'pending',
            schedule_id: `sched_${Math.random().toString(36).substring(2, 15)}`,
            schedule_status: 'pending'
          }
        ];
      }

      paymentsToCreate.push(paymentData);
    }

    // Insert payments
    const result = await Payment.insertMany(paymentsToCreate);
    logger.log(`✅ Successfully created ${result.length} payments for user ${TEST_USER_ID}`);

    // Log summary
    const statusCounts = {};
    const purposeCounts = {};
    const methodCounts = {};

    result.forEach(payment => {
      statusCounts[payment.payment_status] = (statusCounts[payment.payment_status] || 0) + 1;
      purposeCounts[payment.payment_purpose] = (purposeCounts[payment.payment_purpose] || 0) + 1;
      methodCounts[payment.payment_method_type] = (methodCounts[payment.payment_method_type] || 0) + 1;
    });

    logger.log('\n📊 Payment Summary:');
    logger.log('Status Distribution:', statusCounts);
    logger.log('Purpose Distribution:', purposeCounts);
    logger.log('Method Distribution:', methodCounts);

    logger.log('\n🎉 Payment seeding completed successfully!');
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

