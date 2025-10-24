#!/usr/bin/env node

/**
 * Migration Script: Convert blogs from single category to multiple categories
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../src/models/blogs');

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

async function migrateBlogs() {
  console.log('🔄 Starting blog migration...\n');

  try {
    // Find all blogs that have the old 'category' field
    const blogs = await Blog.find({});
    
    let updatedCount = 0;
    
    for (const blog of blogs) {
      // Check if blog has old category field (as ObjectId, not array)
      if (blog.category && !Array.isArray(blog.categories)) {
        // Migrate: move category to categories array
        blog.categories = [blog.category];
        blog.category = undefined; // Remove old field
        await blog.save();
        console.log(`✅ Migrated blog: "${blog.title}"`);
        updatedCount++;
      } else if (!blog.categories || blog.categories.length === 0) {
        console.log(`⚠️  Warning: Blog "${blog.title}" has no categories`);
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} blog(s)`);
    console.log(`   📝 Total: ${blogs.length} blog(s)\n`);

  } catch (error) {
    console.error('❌ Error migrating blogs:', error);
    throw error;
  }
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  BSO - Blog Migration Script                  ');
  console.log('  Convert single category to multiple          ');
  console.log('═══════════════════════════════════════════════\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to database.\n');
    process.exit(1);
  }

  try {
    await migrateBlogs();
    console.log('✅ Migration completed successfully!\n');
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

