/**
 * Create or Update Plan for IAP Testing
 * Creates plan with ID: plan-1af67e74ed if it doesn't exist
 */

require('dotenv').config();
const mongoose = require('mongoose');
const plan = require('./src/models/plan');

const PLAN_DATA = {
  plan_id: "plan-1af67e74ed",
  plan_name: "Supplier Monthly Plan (IAP)",
  type: "supplier",
  interval: "monthly",
  price: 200,
  currency: "USD",
  status: "active",
  plan_type: "premium",
  plan_description: "Monthly subscription plan for suppliers via IAP"
};

async function createOrUpdatePlan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Check if plan exists
    let existingPlan = await plan.findOne({ plan_id: PLAN_DATA.plan_id });

    if (existingPlan) {
      console.log('📋 Plan already exists:');
      console.log('   Plan ID:', existingPlan.plan_id);
      console.log('   Name:', existingPlan.plan_name);
      console.log('   Status:', existingPlan.status);
      console.log('');

      // Update if needed
      if (existingPlan.status !== 'active') {
        existingPlan.status = 'active';
        await existingPlan.save();
        console.log('✅ Plan status updated to active\n');
      } else {
        console.log('✅ Plan is already active\n');
      }
    } else {
      console.log('📝 Creating new plan...\n');
      existingPlan = await plan.create(PLAN_DATA);
      console.log('✅ Plan created successfully!');
      console.log('   Plan ID:', existingPlan.plan_id);
      console.log('   Name:', existingPlan.plan_name);
      console.log('   Type:', existingPlan.type);
      console.log('   Interval:', existingPlan.interval);
      console.log('   Price:', existingPlan.price, existingPlan.currency);
      console.log('   Status:', existingPlan.status);
      console.log('');
    }

    // Verify plan
    const verifiedPlan = await plan.findOne({ plan_id: PLAN_DATA.plan_id });
    console.log('✅ Plan verified in database:');
    console.log(JSON.stringify(verifiedPlan, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.connection.close();
  }
}

createOrUpdatePlan();
