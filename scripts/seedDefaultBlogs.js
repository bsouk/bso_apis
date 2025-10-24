#!/usr/bin/env node

/**
 * Default Blogs Seeding Script
 * Seeds 2 sample blogs with a category
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../src/models/blogs');
const BlogCategory = require('../src/models/blog_categories');

// MongoDB connection
async function connectDB() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Seed data
async function seedBlogs() {
  console.log('🌱 Starting blog seeding...\n');

  try {
    // Create default category
    let category = await BlogCategory.findOne({ slug: 'industry-news' });
    
    if (!category) {
      category = new BlogCategory({
        category_name: 'Industry News',
        slug: 'industry-news',
        description: 'Latest news and updates from the oilfield and industrial sector',
        status: 'active'
      });
      await category.save();
      console.log('✅ Created category: Industry News');
    } else {
      console.log('⏭️  Category "Industry News" already exists');
    }

    // Sample blogs
    const blogs = [
      {
        title: 'The Future of Oilfield Technology in 2025',
        slug: 'future-of-oilfield-technology-2025',
        description: 'Explore the cutting-edge technologies reshaping the oilfield industry, from AI-powered drilling to sustainable energy solutions.',
        content: `<h2>Introduction</h2>
<p>The oilfield industry is experiencing a technological revolution. As we move through 2025, innovative solutions are transforming how we approach exploration, production, and environmental sustainability.</p>

<h3>AI and Machine Learning</h3>
<p>Artificial intelligence is now being used to predict equipment failures, optimize drilling paths, and reduce operational costs. Companies implementing AI-driven predictive maintenance have seen up to 30% reduction in downtime.</p>

<h3>Sustainable Practices</h3>
<p>Environmental consciousness is driving new green technologies in the sector. From carbon capture systems to renewable energy integration, the industry is evolving to meet global sustainability goals.</p>

<h3>Digital Transformation</h3>
<p>Digital platforms like BSO are streamlining procurement, staffing, and logistics, making operations more efficient and transparent. Real-time data analytics and IoT sensors are providing unprecedented insights into field operations.</p>

<h2>Conclusion</h2>
<p>The future of oilfield technology is bright, with innovations that promise increased efficiency, reduced environmental impact, and improved safety standards across the industry.</p>`,
        categories: [category._id],
        image: '/blogs/oilfield-tech-2025.jpg',
        author: 'BSO Team',
        status: 'active',
        tags: ['technology', 'AI', 'sustainability', 'innovation']
      },
      {
        title: 'How to Streamline Industrial Procurement',
        slug: 'streamline-industrial-procurement',
        description: 'Discover proven strategies to optimize your procurement process, reduce costs, and improve supplier relationships in the industrial sector.',
        content: `<h2>Why Procurement Matters</h2>
<p>Effective procurement is the backbone of successful industrial operations. It directly impacts project timelines, budget adherence, and overall operational efficiency.</p>

<h3>1. Centralize Your Supply Chain</h3>
<p>Using a unified platform for procurement eliminates scattered vendor communications and provides a single source of truth. BSO's platform allows buyers to post requirements and receive competitive quotes from verified suppliers in one place.</p>

<h3>2. Leverage Technology</h3>
<p>Modern procurement platforms offer features like:</p>
<ul>
  <li>Automated quote comparisons</li>
  <li>Real-time inventory tracking</li>
  <li>Digital documentation</li>
  <li>Supplier performance analytics</li>
</ul>

<h3>3. Build Strong Supplier Relationships</h3>
<p>Long-term partnerships with reliable suppliers ensure better pricing, priority service, and improved quality. Regular communication and fair payment terms foster trust and collaboration.</p>

<h3>4. Implement Quality Control</h3>
<p>Establish clear quality standards and verification processes. Request certifications, conduct inspections, and maintain detailed records of supplier performance.</p>

<h2>The BSO Advantage</h2>
<p>Platforms like BSO bring buyers and suppliers together, offering transparency, competitive pricing, and streamlined workflows. By digitizing the procurement process, companies save time and reduce operational costs significantly.</p>

<blockquote>
<p>"Since using BSO for our procurement needs, we've reduced sourcing time by 60% and cut costs by 25%." - Procurement Manager, Leading Energy Company</p>
</blockquote>`,
        categories: [category._id],
        image: '/blogs/procurement-guide.jpg',
        author: 'BSO Team',
        status: 'active',
        tags: ['procurement', 'supply chain', 'efficiency', 'best practices']
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const blogData of blogs) {
      const existing = await Blog.findOne({ slug: blogData.slug });
      
      if (!existing) {
        const blog = new Blog(blogData);
        await blog.save();
        console.log(`✅ Added blog: "${blogData.title}"`);
        addedCount++;
      } else {
        console.log(`⏭️  Skipped: "${blogData.title}" - already exists`);
        skippedCount++;
      }
    }

    console.log('\n🎉 Blog seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Added: ${addedCount} blog(s)`);
    console.log(`   ⏭️  Skipped: ${skippedCount} blog(s)`);
    console.log(`   📝 Total: ${blogs.length} blog(s)\n`);

  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    throw error;
  }
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('     BSO - Blog Seeding Script                ');
  console.log('═══════════════════════════════════════════════\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to database.\n');
    process.exit(1);
  }

  try {
    await seedBlogs();
    console.log('✅ Script completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected\n');
  }
}

main();

