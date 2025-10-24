#!/usr/bin/env node

/**
 * Production SEO Pages Seeding Script
 * 
 * This script safely seeds default SEO pages into the production database.
 * It checks for existing entries and only adds new ones.
 * 
 * Usage:
 *   node scripts/seedSEOProduction.js
 * 
 * Requirements:
 *   - MongoDB connection string in .env file
 *   - Production database access
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SeoPage = require('../src/models/seo_pages');

// Default SEO pages data
const defaultSeoPages = [
  {
    page_name: 'Home Page',
    slug: 'home',
    title: 'BSO - Industrial Procurement & Oilfield Services',
    description: 'End-to-end supply chain, staffing, and logistics for the energy industry. Explore jobs, post projects, and source products all in one platform.',
    keywords: 'industrial procurement, staffing, oilfield services, energy logistics, hire resources, post jobs',
    og_title: 'BLUE SKY - Complete Oilfield & Industrial Solutions',
    og_description: 'Leading platform for procurement, staffing, and logistics in the energy sector. Connect with suppliers, find jobs, and manage projects.',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Sign In',
    slug: 'sign-in',
    title: 'Sign In - BSO Platform Access',
    description: 'Access your BSO account to manage procurement, staffing, and logistics. Secure login for buyers, suppliers, and service providers.',
    keywords: 'sign in, login, bso account, user access, platform login',
    og_title: 'Sign In to BSO Platform',
    og_description: 'Login to manage your industrial procurement, staffing, and logistics needs.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'noindex, follow',
    status: 'active'
  },
  {
    page_name: 'About Us',
    slug: 'about-us',
    title: 'About BSO - Industrial Solutions Leader',
    description: 'Learn about BLUE SKY and our mission to revolutionize industrial procurement, staffing, and oilfield services through innovative technology.',
    keywords: 'about bso, company info, industrial solutions, oilfield services, blue sky',
    og_title: 'About BLUE SKY - BSO Services',
    og_description: 'Discover our journey in transforming the energy and industrial sectors through cutting-edge procurement and staffing solutions.',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Contact Us',
    slug: 'contact-us',
    title: 'Contact BSO - Get In Touch',
    description: 'Have questions? Contact our team for support with procurement, staffing, or logistics. We are here to help you succeed.',
    keywords: 'contact, support, customer service, get in touch, help',
    og_title: 'Contact BSO - We Are Here to Help',
    og_description: 'Reach out to our expert team for any questions about our services.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'How It Works',
    slug: 'how-it-works',
    title: 'How BSO Works - Platform Guide',
    description: 'Discover how BSO simplifies procurement, staffing, and logistics. Step-by-step guide to getting started on our platform.',
    keywords: 'how it works, platform guide, getting started, user guide',
    og_title: 'How BSO Platform Works',
    og_description: 'Learn how to leverage our platform for your industrial and oilfield needs.',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'FAQ',
    slug: 'faq',
    title: 'FAQ - Frequently Asked Questions | BSO',
    description: 'Find answers to common questions about using BSO for procurement, staffing, jobs, and logistics in the industrial sector.',
    keywords: 'faq, questions, help, answers, support',
    og_title: 'BSO FAQ - Get Your Questions Answered',
    og_description: 'Browse our comprehensive FAQ section for quick answers.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Terms and Conditions',
    slug: 'terms-conditions',
    title: 'Terms & Conditions - BSO Platform',
    description: 'Read our terms and conditions for using the BSO platform. Legal agreements for users, suppliers, and service providers.',
    keywords: 'terms, conditions, legal, user agreement, policy',
    og_title: 'BSO Terms and Conditions',
    og_description: 'Review our platform terms and conditions.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'noindex, follow',
    status: 'active'
  },
  {
    page_name: 'Privacy Policy',
    slug: 'privacy-policy',
    title: 'Privacy Policy - BSO Data Protection',
    description: 'Your privacy matters. Learn how BSO protects your data and manages information security for all platform users.',
    keywords: 'privacy, data protection, security, gdpr, user data',
    og_title: 'BSO Privacy Policy',
    og_description: 'Understanding how we protect your privacy and data.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'noindex, follow',
    status: 'active'
  },
  {
    page_name: 'Product List',
    slug: 'product-list',
    title: 'Products - Industrial Equipment Catalog | BSO',
    description: 'Browse thousands of industrial products, oilfield equipment, and supplies. Find verified suppliers and compare prices instantly.',
    keywords: 'products, industrial equipment, oilfield supplies, procurement, catalog',
    og_title: 'Industrial Products & Equipment Catalog - BSO',
    og_description: 'Explore our extensive catalog of industrial and oilfield products.',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Search Jobs',
    slug: 'search-job',
    title: 'Find Jobs - Oilfield & Industrial Careers | BSO',
    description: 'Search thousands of job openings in the oilfield and industrial sectors. Apply to positions that match your skills and experience.',
    keywords: 'jobs, careers, employment, oilfield jobs, industrial jobs, hiring',
    og_title: 'Oilfield & Industrial Job Opportunities - BSO',
    og_description: 'Find your next career opportunity in the energy and industrial sectors.',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Post a Job',
    slug: 'post-job',
    title: 'Post a Job - Hire Skilled Workers | BSO',
    description: 'Post job openings and find qualified candidates for your industrial or oilfield projects. Fast, efficient hiring solutions.',
    keywords: 'post job, hiring, recruitment, job posting, find workers',
    og_title: 'Post Jobs and Hire Talent - BSO Platform',
    og_description: 'Connect with skilled professionals for your industrial projects.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Subscription Plan',
    slug: 'subscription-plan',
    title: 'Pricing Plans - BSO Subscriptions',
    description: 'Choose the right subscription plan for your business. Flexible pricing for buyers, suppliers, and logistics providers.',
    keywords: 'pricing, subscription, plans, membership, packages',
    og_title: 'BSO Subscription Plans and Pricing',
    og_description: 'Find the perfect plan for your business needs.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Send Enquiry',
    slug: 'send-enquiry',
    title: 'Send Enquiry - Request for Quote | BSO',
    description: 'Submit product enquiries and receive competitive quotes from verified suppliers. Fast, efficient procurement process.',
    keywords: 'enquiry, rfq, quote request, supplier enquiry, procurement',
    og_title: 'Send Product Enquiry - Get Quotes from Suppliers',
    og_description: 'Request quotes and connect with suppliers for your industrial needs.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Product Query List',
    slug: 'product-query-list',
    title: 'Product Queries - Manage Procurement Requests',
    description: 'View and manage all your product enquiries and quotation requests. Track status and communicate with suppliers.',
    keywords: 'queries, procurement requests, rfq management, quotes',
    og_title: 'Manage Your Product Queries - BSO',
    og_description: 'Track and manage all your procurement enquiries in one place.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'noindex, follow',
    status: 'active'
  },
  {
    page_name: 'Logistic Query List',
    slug: 'logistic-query-list',
    title: 'Logistics Queries - Shipping & Freight | BSO',
    description: 'Track and manage all your logistics and shipping queries. View quotes from logistics providers and manage shipments.',
    keywords: 'logistics, shipping, freight, queries, transport',
    og_title: 'Manage Logistics Queries - BSO',
    og_description: 'Track your shipping and freight enquiries efficiently.',
    og_type: 'website',
    twitter_card: 'summary',
    robots: 'noindex, follow',
    status: 'active'
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
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🔗 Host:', mongoose.connection.host);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Seed SEO pages
async function seedSeoPages() {
  console.log('\n🌱 Starting SEO pages seeding...\n');
  
  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const seoPageData of defaultSeoPages) {
    try {
      // Check if page already exists
      const existingPage = await SeoPage.findOne({ slug: seoPageData.slug });
      
      if (existingPage) {
        console.log(`⏭️  Skipping "${seoPageData.page_name}" - already exists`);
        skippedCount++;
        continue;
      }

      // Create new SEO page
      const newPage = new SeoPage(seoPageData);
      await newPage.save();
      
      console.log(`✅ Added "${seoPageData.page_name}" (${seoPageData.slug})`);
      addedCount++;
      
    } catch (error) {
      console.error(`❌ Error adding "${seoPageData.page_name}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n🎉 SEO seeding completed!');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Added: ${addedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${defaultSeoPages.length}\n`);
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('      BSO - Production SEO Pages Seeding Script       ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('⚠️  WARNING: This script will add SEO data to PRODUCTION database!');
  console.log('📋 Environment:', process.env.NODE_ENV || 'not set');
  console.log('');

  // Connect to database
  const connected = await connectDB();
  
  if (!connected) {
    console.error('\n❌ Failed to connect to database. Exiting...\n');
    process.exit(1);
  }

  // Seed SEO pages
  try {
    await seedSeoPages();
    console.log('✅ Script completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected\n');
  }
}

// Handle errors
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

// Run the script
main();

