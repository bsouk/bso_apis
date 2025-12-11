/**
 * Check available plans in database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const plan = require('./src/models/plan');

async function checkPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find all active plans
    const plans = await plan.find({ status: 'active' }).limit(20);
    
    console.log(`📋 Found ${plans.length} active plans:\n`);
    
    plans.forEach((p, index) => {
      console.log(`${index + 1}. Plan ID: ${p.plan_id}`);
      console.log(`   Name: ${p.plan_name}`);
      console.log(`   Type: ${p.type}`);
      console.log(`   Interval: ${p.interval}`);
      console.log(`   Price: ${p.price} ${p.currency || 'USD'}`);
      console.log('');
    });

    // Find supplier plans specifically
    const supplierPlans = await plan.find({ 
      status: 'active',
      type: 'supplier'
    });
    
    console.log(`\n📦 Supplier Plans (${supplierPlans.length}):\n`);
    supplierPlans.forEach((p, index) => {
      console.log(`${index + 1}. ${p.plan_id} - ${p.plan_name} (${p.interval}) - ${p.price} ${p.currency || 'USD'}`);
    });

    // Check for the specific plan
    const specificPlan = await plan.findOne({ plan_id: 'plan-1af67e74ed' });
    if (specificPlan) {
      console.log('\n✅ Plan "plan-1af67e74ed" exists!');
      console.log(JSON.stringify(specificPlan, null, 2));
    } else {
      console.log('\n❌ Plan "plan-1af67e74ed" NOT found');
      console.log('\n💡 Available supplier plan IDs:');
      supplierPlans.forEach(p => {
        console.log(`   - ${p.plan_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkPlans();
