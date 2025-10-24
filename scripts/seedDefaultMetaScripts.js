#!/usr/bin/env node

/**
 * Default Meta Scripts Seeding Script
 * 
 * Seeds essential third-party scripts (Google Analytics, Google Tag Manager)
 * with secure placeholder system for production deployment.
 * 
 * Usage: npm run seed-meta-scripts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MetaScript = require('../src/models/meta_scripts');

// Default meta scripts with placeholders for security
const defaultMetaScripts = [
  {
    script_name: 'Google Analytics',
    description: 'Google Analytics tracking for website analytics and user behavior insights',
    script_type: 'analytics',
    position: 'head',
    script_content: `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={{GOOGLE_ANALYTICS_ID}}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '{{GOOGLE_ANALYTICS_ID}}');
</script>`,
    placeholders: [
      {
        key: 'GOOGLE_ANALYTICS_ID',
        description: 'Google Analytics Measurement ID',
        example: 'G-XXXXXXXXXX'
      }
    ],
    order: 10,
    load_strategy: 'async',
    status: 'active',
    notes: 'Main Google Analytics tracking code. Replace {{GOOGLE_ANALYTICS_ID}} with actual ID in .env file.'
  },
  {
    script_name: 'Google Tag Manager - Head',
    description: 'Google Tag Manager initialization script for advanced tag management',
    script_type: 'tag-manager',
    position: 'head',
    script_content: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','{{GOOGLE_TAG_MANAGER_ID}}');</script>
<!-- End Google Tag Manager -->`,
    placeholders: [
      {
        key: 'GOOGLE_TAG_MANAGER_ID',
        description: 'Google Tag Manager Container ID',
        example: 'GTM-XXXXXXX'
      }
    ],
    order: 5,
    load_strategy: 'blocking',
    status: 'active',
    notes: 'Google Tag Manager head script. Must load before GTM body script. Replace {{GOOGLE_TAG_MANAGER_ID}} with actual ID in .env file.'
  },
  {
    script_name: 'Google Tag Manager - Body',
    description: 'Google Tag Manager noscript fallback for users with JavaScript disabled',
    script_type: 'tag-manager',
    position: 'body-start',
    script_content: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{GOOGLE_TAG_MANAGER_ID}}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
    placeholders: [
      {
        key: 'GOOGLE_TAG_MANAGER_ID',
        description: 'Google Tag Manager Container ID (same as head script)',
        example: 'GTM-XXXXXXX'
      }
    ],
    order: 1,
    load_strategy: 'blocking',
    status: 'active',
    notes: 'GTM noscript fallback for body. Uses same {{GOOGLE_TAG_MANAGER_ID}} as head script.'
  }
];

// MongoDB connection
async function connectDB() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Seed meta scripts
async function seedMetaScripts() {
  console.log('\n🌱 Starting meta scripts seeding...\n');
  
  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const scriptData of defaultMetaScripts) {
    try {
      // Check if script already exists
      const existingScript = await MetaScript.findOne({ script_name: scriptData.script_name });
      
      if (existingScript) {
        console.log(`⏭️  Skipping "${scriptData.script_name}" - already exists`);
        skippedCount++;
        continue;
      }

      // Create new meta script
      const newScript = new MetaScript(scriptData);
      await newScript.save();
      
      console.log(`✅ Added "${scriptData.script_name}" (${scriptData.position})`);
      addedCount++;
      
    } catch (error) {
      console.error(`❌ Error adding "${scriptData.script_name}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n🎉 Meta scripts seeding completed!');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Added: ${addedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${defaultMetaScripts.length}\n`);

  if (addedCount > 0) {
    console.log('⚠️  IMPORTANT: Add these to your .env file:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('GOOGLE_ANALYTICS_ID=G-RS2H45YKSQ');
    console.log('GOOGLE_TAG_MANAGER_ID=GTM-PNRVGZSD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         BSO - Meta Scripts Seeding Script            ');
  console.log('═══════════════════════════════════════════════════════\n');

  const connected = await connectDB();
  
  if (!connected) {
    console.error('\n❌ Failed to connect to database. Exiting...\n');
    process.exit(1);
  }

  try {
    await seedMetaScripts();
    console.log('✅ Script completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected\n');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Process interrupted. Cleaning up...');
  await mongoose.disconnect();
  console.log('✅ Cleanup complete. Exiting...\n');
  process.exit(0);
});

// Run
main();

