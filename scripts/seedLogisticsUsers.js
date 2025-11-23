/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

const User = require('../src/models/user');
const Subscription = require('../src/models/subscription');
const Plan = require('../src/models/plan');

const MONGO_URI = process.env.MONGODB_URI;

// Generate unique subscription ID
function generateSubscriptionId() {
  const token = crypto.randomBytes(5).toString('hex');
  return `sub-${token}`;
}

// Generate unique user ID helper
const sanitizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

async function generateUniqueUserId(firstName, lastName, email) {
  let identifier = '';
  
  if (firstName && lastName) {
    identifier = `${sanitizeText(firstName)}-${sanitizeText(lastName)}`;
  } else if (firstName) {
    identifier = sanitizeText(firstName);
  } else if (email) {
    const emailPrefix = email.split('@')[0];
    identifier = sanitizeText(emailPrefix);
  } else {
    identifier = 'user';
  }
  
  if (identifier.length > 30) {
    identifier = identifier.substring(0, 30);
  }
  
  const generateSuffix = () => {
    const timestamp = Date.now().toString(36).slice(-3);
    const random = Math.random().toString(36).slice(2, 5);
    return timestamp + random;
  };
  
  let userId = '';
  let suffix = generateSuffix();
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    userId = `user-${identifier}-${suffix}`;
    attempts++;
    
    const existingUser = await User.findOne({ unique_user_id: userId });
    if (!existingUser) {
      break;
    }
    
    suffix = generateSuffix();
  } while (attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    const emergencySuffix = Date.now().toString(36);
    userId = `user-${identifier}-${emergencySuffix}`;
  }
  
  return userId;
}

// Sample logistics users data
const logisticsUsersData = [
  {
    first_name: 'John',
    last_name: 'Smith',
    full_name: 'John Smith',
    email: 'john.smith@logistics-demo.com',
    phone_number_code: '+44',
    phone_number: '7700123456',
    company_name: 'Swift Transport Ltd',
    city: 'London',
    country: 'United Kingdom',
    description: 'Fast and reliable logistics services across UK and Europe'
  },
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@logistics-demo.com',
    phone_number_code: '+44',
    phone_number: '7700234567',
    company_name: 'Global Freight Solutions',
    city: 'Manchester',
    country: 'United Kingdom',
    description: 'International shipping and freight forwarding specialists'
  },
  {
    first_name: 'Michael',
    last_name: 'Brown',
    full_name: 'Michael Brown',
    email: 'michael.brown@logistics-demo.com',
    phone_number_code: '+44',
    phone_number: '7700345678',
    company_name: 'Express Logistics Co',
    city: 'Birmingham',
    country: 'United Kingdom',
    description: 'Express delivery services for time-sensitive shipments'
  },
  {
    first_name: 'Emma',
    last_name: 'Davis',
    full_name: 'Emma Davis',
    email: 'emma.davis@logistics-demo.com',
    phone_number_code: '+44',
    phone_number: '7700456789',
    company_name: 'Coastal Shipping Services',
    city: 'Liverpool',
    country: 'United Kingdom',
    description: 'Maritime and coastal shipping logistics provider'
  },
  {
    first_name: 'David',
    last_name: 'Wilson',
    full_name: 'David Wilson',
    email: 'david.wilson@logistics-demo.com',
    phone_number_code: '+44',
    phone_number: '7700567890',
    company_name: 'Warehouse Distribution Hub',
    city: 'Leeds',
    country: 'United Kingdom',
    description: 'Warehousing and distribution services nationwide'
  }
];

async function seedLogisticsUsers({ useExistingConnection = false, logger = console } = {}) {
  if (!useExistingConnection && !MONGO_URI) {
    throw new Error('❌ MONGODB_URI is not defined in the environment variables.');
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

    // Find or create a logistics plan
    let logisticsPlan = await Plan.findOne({ 
      type: 'logistics', 
      status: 'active' 
    }).sort({ createdAt: -1 });

    if (!logisticsPlan) {
      logger.log('⚠️  No logistics plan found. Creating a default logistics plan...');
      
      // Create a default logistics plan
      const planId = `plan-${crypto.randomBytes(5).toString('hex')}`;
      logisticsPlan = new Plan({
        plan_id: planId,
        type: 'logistics',
        plan_name: 'Logistics Monthly Plan (Demo)',
        plan_description: 'Monthly subscription plan for logistics providers',
        price: 29,
        currency: 'GBP',
        interval: 'monthly',
        interval_count: 1,
        plan_type: 'premium',
        status: 'active',
        selected: true,
        allowed_user: 1,
        plan_step: 'direct',
        access_level: 'fully'
      });
      
      await logisticsPlan.save();
      logger.log(`✅ Created default logistics plan (${logisticsPlan.plan_id})`);
    } else {
      logger.log(`✅ Using existing logistics plan (${logisticsPlan.plan_id})`);
    }

    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of logisticsUsersData) {
      try {
        // Check if user already exists by email
        const existingUser = await User.findOne({ 
          email: userData.email.toLowerCase() 
        });

        if (existingUser) {
          logger.log(`⚠️  User with email ${userData.email} already exists. Skipping...`);
          skippedUsers.push(userData.email);
          continue;
        }

        // Generate unique user ID
        const uniqueUserId = await generateUniqueUserId(
          userData.first_name,
          userData.last_name,
          userData.email
        );

        // Hash password (default password: Logistics123!)
        const defaultPassword = 'Logistics123!';
        const hashedPassword = bcrypt.hashSync(defaultPassword, bcrypt.genSaltSync(10));

        // Create user
        const newUser = new User({
          unique_user_id: uniqueUserId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          full_name: userData.full_name,
          email: userData.email.toLowerCase(),
          phone_number_code: userData.phone_number_code,
          phone_number: userData.phone_number,
          password: hashedPassword,
          decoded_password: defaultPassword,
          signup_by: 'email',
          user_type: ['logistics'],
          current_user_type: 'logistics',
          status: 'active',
          logistics_status: 'active',
          is_user_approved_by_admin: true,
          is_company_approved: true,
          is_deleted: false,
          is_trashed: false,
          profile_completed: true,
          joining_date: new Date(),
          company_data: {
            name: userData.company_name,
            registration_number: `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            vat_number: `VAT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
            address: {
              line1: `123 ${userData.company_name} Street`,
              line2: 'Unit 5',
              city: userData.city,
              state: '',
              zip_code: 'SW1A 1AA',
              country: userData.country
            },
            description: userData.description,
            website: `https://www.${userData.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `${userData.phone_number_code} ${userData.phone_number}`,
            email: userData.email
          },
          address: {
            line1: `123 ${userData.company_name} Street`,
            line2: 'Unit 5',
            city: userData.city,
            state: '',
            zip_code: 'SW1A 1AA',
            country: userData.country
          },
          additional_notes: userData.description
        });

        await newUser.save();
        logger.log(`✅ Created user: ${userData.full_name} (${uniqueUserId})`);

        // Create active subscription for the user
        const subscriptionId = generateSubscriptionId();
        const startDate = new Date();
        const endDate = new Date(startDate);
        
        // Set end date based on plan interval
        if (logisticsPlan.interval === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (logisticsPlan.interval === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const subscription = new Subscription({
          user_id: newUser._id,
          subscription_id: subscriptionId,
          plan_id: logisticsPlan.plan_id,
          start_at: startDate,
          end_at: endDate,
          status: 'active',
          type: 'logistics',
          subscription_type: 'paid',
          source: 'system',
          payment_mode: 'admin_manual',
          isPurchased: true,
          is_active: true
        });

        await subscription.save();
        logger.log(`✅ Created active subscription for ${userData.full_name} (${subscriptionId})`);

        createdUsers.push({
          name: userData.full_name,
          email: userData.email,
          unique_user_id: uniqueUserId,
          company: userData.company_name,
          subscription_id: subscriptionId,
          password: defaultPassword
        });

      } catch (error) {
        logger.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    logger.log('\n🎉 Logistics users seeding completed!\n');
    logger.log('📊 Summary:');
    logger.log(`   ✅ Created: ${createdUsers.length} users`);
    logger.log(`   ⚠️  Skipped: ${skippedUsers.length} users (already exist)`);
    
    if (createdUsers.length > 0) {
      logger.log('\n📋 Created Users Details:');
      logger.log('   (Default password for all users: Logistics123!)');
      createdUsers.forEach((user, index) => {
        logger.log(`\n   ${index + 1}. ${user.name}`);
        logger.log(`      Email: ${user.email}`);
        logger.log(`      User ID: ${user.unique_user_id}`);
        logger.log(`      Company: ${user.company}`);
        logger.log(`      Subscription ID: ${user.subscription_id}`);
        logger.log(`      Password: ${user.password}`);
      });
    }

    return {
      created: createdUsers.length,
      skipped: skippedUsers.length,
      users: createdUsers
    };

  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    if (connectedHere) {
      await mongoose.disconnect();
      logger.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

module.exports = seedLogisticsUsers;

if (require.main === module) {
  seedLogisticsUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

