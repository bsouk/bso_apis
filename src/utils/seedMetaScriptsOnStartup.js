/**
 * Meta Scripts Auto-Seeding Utility
 * 
 * Automatically seeds default meta scripts on server startup.
 * Runs silently and only adds missing entries.
 */

const MetaScript = require('../models/meta_scripts');

// Default meta scripts with secure placeholders
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
    notes: 'Google Tag Manager head script. Must load before GTM body script.'
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

/**
 * Seed default meta scripts if they don't exist
 * Runs silently on server startup
 */
async function seedDefaultMetaScripts() {
  try {
    let addedCount = 0;
    
    for (const scriptData of defaultMetaScripts) {
      // Check if script already exists
      const existingScript = await MetaScript.findOne({ script_name: scriptData.script_name });
      
      if (!existingScript) {
        // Create new meta script
        const newScript = new MetaScript(scriptData);
        await newScript.save();
        addedCount++;
      }
    }

    if (addedCount > 0) {
      console.log(`✅ Meta Scripts: Added ${addedCount} new default entries`);
      console.log('⚠️  Remember to add these to .env: GOOGLE_ANALYTICS_ID, GOOGLE_TAG_MANAGER_ID');
    } else {
      console.log('✅ Meta Scripts: All default entries already exist');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error seeding meta scripts:', error.message);
    return false;
  }
}

module.exports = { seedDefaultMetaScripts };

