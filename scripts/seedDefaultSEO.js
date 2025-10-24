require("dotenv").config();
const mongoose = require('mongoose');
const SeoPage = require("../src/models/seo_pages");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Default SEO pages data
const defaultSeoPages = [
  {
    page_name: 'Home Page',
    slug: 'home',
    title: 'BSO - Industrial Procurement & Oilfield Services',
    description: 'End-to-end supply chain, staffing, and logistics for the energy industry. Explore jobs, post projects, and source products all in one platform.',
    keywords: 'industrial procurement, staffing, oilfield services, energy logistics, hire resources, post jobs',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Sign In',
    slug: 'sign-in',
    title: 'Sign In - Industrial Procurement Account | BSO',
    description: 'Log in to manage your account, track orders, post jobs, and access the full features of our energy sector platform.',
    keywords: 'sign in, login, industrial procurement, user account, energy platform access',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'About Us',
    slug: 'about-us',
    title: 'About Blue Sky Oilfield Services | BSO',
    description: 'Learn about BSO\'s vision, leadership, and commitment to transforming procurement & staffing in oil & gas.',
    keywords: 'about BSO, company mission, oilfield supply, procurement company',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Contact Us',
    slug: 'contact-us',
    title: 'Contact BSO - Procurement & Logistics Solutions',
    description: 'Reach out to Blue Sky Oilfield for support, business inquiries, or platform assistance.',
    keywords: 'contact us, get support, industrial procurement contact',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'How It Works',
    slug: 'how-it-works',
    title: 'How It Works - Oilfield Procurement & Hiring | BSO',
    description: 'Understand the step-by-step process of sourcing, hiring, and managing industrial logistics via BSO.',
    keywords: 'how BSO works, procurement process, hiring flow',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'FAQ',
    slug: 'faq',
    title: 'Frequently Asked Questions - BSO Support',
    description: 'Find answers to common questions about using the BSO platform, account setup, and services.',
    keywords: 'faq, questions, support center, platform help',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Terms and Conditions',
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions - BSO Platform Agreement',
    description: 'Read our terms of service, user agreement, and platform policies for Blue Sky Oilfield Services.',
    keywords: 'terms and conditions, user agreement, platform policies',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Privacy Policy',
    slug: 'privacy-policy',
    title: 'Privacy Policy - How BSO Protects Your Data',
    description: 'Learn how Blue Sky Oilfield Services collects, uses, and protects your personal information.',
    keywords: 'privacy policy, data protection, user privacy',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Product List',
    slug: 'product-list',
    title: 'Browse Industrial Products - Oilfield Supply | BSO',
    description: 'Explore our wide range of procurement-ready oilfield and industrial products.',
    keywords: 'oilfield supplies, industrial products, product catalog, buy equipment',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Search Jobs',
    slug: 'search-job',
    title: 'Search Industrial & Oilfield Jobs | BSO Careers',
    description: 'Explore the latest jobs in procurement, logistics, and oilfield sectors. Apply today!',
    keywords: 'oilfield jobs, industrial careers, procurement job search, energy job portal',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Post a Job',
    slug: 'post-a-job',
    title: 'Post a Job - Hire Industrial Talent | BSO',
    description: 'Quickly post jobs and connect with skilled resources across oil & gas, energy and logistics.',
    keywords: 'post job, hire workforce, oilfield jobs, industrial hiring',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Subscription Plan',
    slug: 'subscription-plan',
    title: 'Subscription Plans - Choose the Right BSO Plan',
    description: 'Compare pricing and features across BSO\'s platform plans for buyers, suppliers, and recruiters.',
    keywords: 'subscription, pricing, platform plan, industrial SaaS',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Send Enquiry',
    slug: 'send-enquiry',
    title: 'Send Enquiry - Request Products & Services | BSO',
    description: 'Submit your procurement enquiries and receive competitive quotes from verified suppliers.',
    keywords: 'send enquiry, request quote, procurement request, supplier quotes',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Product Query List',
    slug: 'product-query-list',
    title: 'Product Queries - Manage Procurement Requests | BSO',
    description: 'View and manage all your product enquiries and supplier quotations in one place.',
    keywords: 'product queries, enquiry management, quote tracking',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  },
  {
    page_name: 'Logistic Query List',
    slug: 'logistic-query-list',
    title: 'Logistics Queries - Shipping & Freight | BSO',
    description: 'Track and manage all your logistics enquiries and provider quotations.',
    keywords: 'logistics queries, shipping requests, freight management',
    og_type: 'website',
    robots: 'index, follow',
    status: 'active'
  }
];

// Seed function
const seedDefaultSEO = async () => {
  try {
    console.log('🌱 Starting SEO pages seeding...\n');

    for (const seoPage of defaultSeoPages) {
      // Check if SEO page already exists
      const existing = await SeoPage.findOne({ slug: seoPage.slug });
      
      if (existing) {
        console.log(`⏭️  Skipping "${seoPage.page_name}" - already exists`);
      } else {
        await SeoPage.create(seoPage);
        console.log(`✅ Created SEO page: "${seoPage.page_name}" (slug: ${seoPage.slug})`);
      }
    }

    console.log(`\n🎉 SEO seeding completed!`);
    console.log(`📊 Total pages processed: ${defaultSeoPages.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding SEO pages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');
    process.exit(0);
  }
};

// Run the seed function
(async () => {
  await connectDB();
  await seedDefaultSEO();
})();

