/**
 * Create or Activate Plans for All-in-One Subscription
 * Ensures both plan-1af67e74ed and plan-83b828af5a exist and are active
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('./src/models/plan');

async function createAllInOnePlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    const plansToCreate = [
      {
        plan_id: 'plan-1af67e74ed',
        plan_name: 'Supplier Monthly Plan (IAP)',
        type: 'supplier',
        interval: 'monthly',
        price: 0, // Set actual price
        currency: 'USD',
        status: 'active',
        plan_type: 'premium',
        allowed_user: 1
      },
      {
        plan_id: 'plan-83b828af5a',
        plan_name: 'Buyer Monthly Plan (IAP)',
        type: 'buyer',
        interval: 'monthly',
        price: 0, // Set actual price
        currency: 'USD',
        status: 'active',
        plan_type: 'premium',
        allowed_user: 1
      }
    ];

    console.log('🔍 Checking and creating plans...\n');

    for (const planData of plansToCreate) {
      let existingPlan = await Plan.findOne({ plan_id: planData.plan_id });

      if (existingPlan) {
        // Update to ensure it's active
        existingPlan.status = 'active';
        existingPlan.plan_name = planData.plan_name;
        existingPlan.type = planData.type;
        existingPlan.interval = planData.interval;
        await existingPlan.save();
        console.log(`✅ Updated plan: ${planData.plan_id} - ${planData.plan_name}`);
      } else {
        // Create new plan
        const newPlan = new Plan(planData);
        await newPlan.save();
        console.log(`✅ Created plan: ${planData.plan_id} - ${planData.plan_name}`);
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ PLANS READY FOR ALL-IN-ONE SUBSCRIPTION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Verify plans
    const plan1 = await Plan.findOne({ plan_id: 'plan-1af67e74ed' });
    const plan2 = await Plan.findOne({ plan_id: 'plan-83b828af5a' });

    console.log('📋 Plan Status:');
    console.log(`  ✅ ${plan1.plan_id}: ${plan1.plan_name} (${plan1.status})`);
    console.log(`  ✅ ${plan2.plan_id}: ${plan2.plan_name} (${plan2.status})`);
    console.log('');
    console.log('💡 These plans are now ready for:');
    console.log('   Product ID: com.bluesky.pro.allinone_monthly');
    console.log('   Plan IDs: plan-1af67e74ed,plan-83b828af5a');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.connection.close();
  }
}

createAllInOnePlans();
