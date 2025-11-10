const mongoose = require('mongoose');

/**
 * Database Indexing Utility for Performance Optimization
 * 
 * This script creates indexes for better query performance,
 * especially important for millions of users.
 */

/**
 * Creates indexes for the User collection
 * @param {mongoose.Connection} db - Database connection
 */
async function createUserIndexes(db) {
  try {
    const userCollection = db.collection('users');
    
    console.log('🔍 Creating indexes for users collection...');
    
    // 1. Unique User ID Index (for fast user ID lookups)
    await userCollection.createIndex(
      { unique_user_id: 1 },
      { 
        unique: true, 
        name: 'unique_user_id_1',
        background: true 
      }
    );
    console.log('✅ Created unique_user_id index');
    
    // 2. Email Index (for authentication and search)
    await userCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        name: 'email_1',
        background: true 
      }
    );
    console.log('✅ Created email index');
    
    // 3. Phone Number Index (for authentication and search)
    await userCollection.createIndex(
      { phone_number: 1 },
      { 
        name: 'phone_number_1',
        background: true 
      }
    );
    console.log('✅ Created phone_number index');
    
    // 4. Status Index (for filtering active/inactive users)
    await userCollection.createIndex(
      { status: 1 },
      { 
        name: 'status_1',
        background: true 
      }
    );
    console.log('✅ Created status index');
    
    // 5. Trash Status Index (for filtering trashed users)
    await userCollection.createIndex(
      { is_trashed: 1 },
      { 
        name: 'is_trashed_1',
        background: true 
      }
    );
    console.log('✅ Created is_trashed index');
    
    // 6. User Type Index (for filtering by user type)
    await userCollection.createIndex(
      { user_type: 1 },
      { 
        name: 'user_type_1',
        background: true 
      }
    );
    console.log('✅ Created user_type index');
    
    // 7. Created Date Index (for sorting and filtering by date)
    await userCollection.createIndex(
      { createdAt: -1 },
      { 
        name: 'createdAt_-1',
        background: true 
      }
    );
    console.log('✅ Created createdAt index');
    
    // 8. Trashed Date Index (for sorting trashed users)
    await userCollection.createIndex(
      { trashed_at: -1 },
      { 
        name: 'trashed_at_-1',
        background: true 
      }
    );
    console.log('✅ Created trashed_at index');
    
    // 9. Compound Index for Active Users (most common query)
    await userCollection.createIndex(
      { 
        is_deleted: 1, 
        is_trashed: 1, 
        status: 1 
      },
      { 
        name: 'active_users_compound',
        background: true 
      }
    );
    console.log('✅ Created active_users compound index');
    
    // 10. Compound Index for Search (name, email, phone, user_id)
    await userCollection.createIndex(
      { 
        full_name: 'text',
        email: 'text',
        phone_number: 'text',
        unique_user_id: 'text',
        first_name: 'text',
        last_name: 'text'
      },
      { 
        name: 'search_text',
        background: true,
        weights: {
          unique_user_id: 10,    // User ID has highest weight
          email: 5,              // Email has medium weight
          full_name: 3,          // Name has medium weight
          phone_number: 2,       // Phone has lower weight
          first_name: 3,
          last_name: 3
        }
      }
    );
    console.log('✅ Created search text index');
    
    // 11. Compound Index for Customer List (most optimized for customer management)
    await userCollection.createIndex(
      { 
        user_type: 1,
        is_deleted: 1,
        is_trashed: 1,
        createdAt: -1
      },
      { 
        name: 'customer_list_compound',
        background: true 
      }
    );
    console.log('✅ Created customer_list compound index');
    
    console.log('🎉 All user indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating user indexes:', error);
    throw error;
  }
}

/**
 * Creates indexes for the Admin collection
 * @param {mongoose.Connection} db - Database connection
 */
async function createAdminIndexes(db) {
  try {
    const adminCollection = db.collection('admins');
    
    console.log('🔍 Creating indexes for admins collection...');
    
    // Email index for admin authentication
    await adminCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        name: 'admin_email_1',
        background: true 
      }
    );
    console.log('✅ Created admin email index');
    
    // Status index for active admins
    await adminCollection.createIndex(
      { status: 1 },
      { 
        name: 'admin_status_1',
        background: true 
      }
    );
    console.log('✅ Created admin status index');
    
    console.log('🎉 All admin indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating admin indexes:', error);
    throw error;
  }
}

/**
 * Creates indexes for other collections
 * @param {mongoose.Connection} db - Database connection
 */
async function createOtherIndexes(db) {
  try {
    console.log('🔍 Creating indexes for other collections...');
    
    // Orders collection indexes
    const ordersCollection = db.collection('orders');
    await ordersCollection.createIndex({ buyer_id: 1, createdAt: -1 }, { background: true });
    await ordersCollection.createIndex({ logistics_id: 1, createdAt: -1 }, { background: true });
    await ordersCollection.createIndex({ order_status: 1, createdAt: -1 }, { background: true });
    console.log('✅ Created orders indexes');
    
    // Products collection indexes
    const productsCollection = db.collection('products');
    await productsCollection.createIndex({ user_id: 1, is_deleted: 1 }, { background: true });
    await productsCollection.createIndex({ category_id: 1, is_deleted: 1 }, { background: true });
    await productsCollection.createIndex({ is_admin_approved: 1, createdAt: -1 }, { background: true });
    console.log('✅ Created products indexes');
    
    // Queries collection indexes
    const queriesCollection = db.collection('queries');
    await queriesCollection.createIndex({ createdByUser: 1, createdAt: -1 }, { background: true });
    await queriesCollection.createIndex({ status: 1, createdAt: -1 }, { background: true });
    console.log('✅ Created queries indexes');

    // Currency collection indexes
    const currencyCollection = db.collection('currencies');
    await currencyCollection.createIndex({ code: 1 }, { unique: true, background: true });
    await currencyCollection.createIndex({ status: 1, is_default: 1 }, { background: true });
    console.log('✅ Created currencies indexes');
    
    console.log('🎉 All other indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating other indexes:', error);
    throw error;
  }
}

/**
 * Main function to create all indexes
 */
async function createAllIndexes() {
  try {
    console.log('🚀 Starting database indexing process...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Create all indexes
    await createUserIndexes(db);
    await createAdminIndexes(db);
    await createOtherIndexes(db);
    
    console.log('🎉 All database indexes created successfully!');
    console.log('💡 Your database is now optimized for millions of users!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

/**
 * Function to check existing indexes
 */
async function checkExistingIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking existing indexes...');
    
    const userIndexes = await db.collection('users').indexes();
    console.log('📊 User collection indexes:');
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
  }
}

module.exports = {
  createAllIndexes,
  checkExistingIndexes,
  createUserIndexes,
  createAdminIndexes,
  createOtherIndexes
};

// If this file is run directly, create all indexes
if (require.main === module) {
  createAllIndexes();
}









