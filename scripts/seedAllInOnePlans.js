/* eslint-disable no-console */
require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');

const Plan = require('../src/models/plan');
const Currency = require('../src/models/currency');

const MONGO_URI = process.env.MONGODB_URI;

const randomPlanId = () => `plan-${crypto.randomBytes(5).toString('hex')}`;

const features = [
  'Unlimited RFQ quotes as a verified Supplier',
  'Quote & post transport jobs as a Logistics Provider',
  'Post unlimited jobs with AI help as a Recruiter',
  'Analytics for quotes, jobs & logistics activity',
  'AI tools for quoting, hiring & freight matching',
  'Mobile app access for all roles, anytime',
  'Smart alerts via app & email in real time',
  'Verified badge & top placement in listings',
  'Priority support: chat, email & phone calls',
].join('\n');

const plansToSeed = [
  {
    plan_name: 'All-in-One monthly pack',
    interval: 'monthly',
    price: 94,
    plan_description: features,
  },
  {
    plan_name: 'All-in-One yearly pack',
    interval: 'yearly',
    price: 900,
    plan_description: features,
  },
];

async function seedAllInOnePlans({ useExistingConnection = false, logger = console } = {}) {
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

    const defaultCurrencyDoc = await Currency.findOne({ is_default: true, status: 'active' });
    const fallbackCurrencyDoc = await Currency.findOne({ status: 'active' });
    const currencyCode = defaultCurrencyDoc?.code || fallbackCurrencyDoc?.code || 'USD';

    for (const planData of plansToSeed) {
      const existing = await Plan.findOne({ type: 'all_in_one', interval: planData.interval });

      if (existing) {
        existing.plan_name = planData.plan_name;
        existing.price = planData.price;
        existing.plan_description = planData.plan_description;
        existing.currency = currencyCode;
        existing.status = 'active';
        existing.selected = true;
        existing.is_auto_renewal = true;
        existing.interval_count = 1;
        existing.allowed_user = existing.allowed_user || 1;
        existing.plan_step = existing.plan_step || 'direct';

        await existing.save();
        logger.log(`ℹ️  Updated existing ${planData.interval} All-in-One plan (${existing.plan_id})`);
      } else {
        const doc = new Plan({
          plan_id: randomPlanId(),
          type: 'all_in_one',
          plan_name: planData.plan_name,
          plan_description: planData.plan_description,
          price: planData.price,
          currency: currencyCode,
          interval: planData.interval,
          interval_count: 1,
          plan_step: 'direct',
          plan_type: 'premium',
          allowed_user: 1,
          selected: true,
          is_auto_renewal: true,
          status: 'active',
        });

        await doc.save();
        logger.log(`✅ Inserted new ${planData.interval} All-in-One plan (${doc.plan_id})`);
      }
    }

    logger.log('🎉 All-in-One plan seeding completed.');
  } finally {
    if (connectedHere) {
      await mongoose.disconnect();
      logger.log('🔌 Disconnected from MongoDB');
    }
  }
}

module.exports = seedAllInOnePlans;

if (require.main === module) {
  seedAllInOnePlans()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

