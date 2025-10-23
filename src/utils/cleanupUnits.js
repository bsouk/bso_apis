/**
 * Utility to cleanup all existing units from the database
 * This will delete all units that are not referenced in any enquiries
 */

const quantity_units = require("../models/quantity_units");
const Query = require("../models/query");
const Enquiry = require("../models/Enquiry");

/**
 * Delete all units that are not being used in any enquiries
 */
async function cleanupUnusedUnits() {
  try {
    console.log('🧹 Starting unit cleanup...');
    
    // Get all unit IDs that are currently in use
    const unitsInQueries = await Query.aggregate([
      { $unwind: "$queryDetails" },
      { 
        $group: { 
          _id: "$queryDetails.quantity.unit" 
        } 
      },
      { $project: { _id: 1 } }
    ]);
    
    const unitsInEnquiries = await Enquiry.aggregate([
      { $unwind: "$enquiry_items" },
      { 
        $group: { 
          _id: "$enquiry_items.quantity.unit" 
        } 
      },
      { $project: { _id: 1 } }
    ]);
    
    // Combine both arrays and get unique unit IDs
    const usedUnitIds = [
      ...unitsInQueries.map(u => u._id?.toString()).filter(Boolean),
      ...unitsInEnquiries.map(u => u._id?.toString()).filter(Boolean)
    ];
    
    const uniqueUsedUnitIds = [...new Set(usedUnitIds)];
    
    console.log(`📊 Found ${uniqueUsedUnitIds.length} units currently in use`);
    
    // Delete units that are NOT in the used list
    const deleteResult = await quantity_units.deleteMany({
      _id: { $nin: uniqueUsedUnitIds }
    });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} unused units`);
    
    // Get remaining units count
    const remainingCount = await quantity_units.countDocuments();
    console.log(`📝 Remaining units in database: ${remainingCount}`);
    
    return {
      deleted: deleteResult.deletedCount,
      remaining: remainingCount,
      inUse: uniqueUsedUnitIds.length
    };
    
  } catch (error) {
    console.error('❌ Error in cleanupUnusedUnits:', error);
    throw error;
  }
}

/**
 * Delete ALL units from the database (WARNING: Use with caution!)
 */
async function deleteAllUnits() {
  try {
    console.log('⚠️  WARNING: Deleting ALL units from database...');
    
    const totalUnits = await quantity_units.countDocuments();
    console.log(`📊 Total units to delete: ${totalUnits}`);
    
    const result = await quantity_units.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} units`);
    
    return {
      deleted: result.deletedCount
    };
    
  } catch (error) {
    console.error('❌ Error in deleteAllUnits:', error);
    throw error;
  }
}

/**
 * Get statistics about units
 */
async function getUnitStats() {
  try {
    const totalUnits = await quantity_units.countDocuments();
    const activeUnits = await quantity_units.countDocuments({ isActive: true });
    const inactiveUnits = await quantity_units.countDocuments({ isActive: false });
    
    // Get units in use
    const unitsInQueries = await Query.distinct("queryDetails.quantity.unit");
    const unitsInEnquiries = await Enquiry.distinct("enquiry_items.quantity.unit");
    const allUsedUnits = [...new Set([...unitsInQueries, ...unitsInEnquiries])];
    
    console.log('📊 Unit Statistics:');
    console.log(`   Total units: ${totalUnits}`);
    console.log(`   Active units: ${activeUnits}`);
    console.log(`   Inactive units: ${inactiveUnits}`);
    console.log(`   Units in use: ${allUsedUnits.length}`);
    console.log(`   Unused units: ${totalUnits - allUsedUnits.length}`);
    
    return {
      total: totalUnits,
      active: activeUnits,
      inactive: inactiveUnits,
      inUse: allUsedUnits.length,
      unused: totalUnits - allUsedUnits.length
    };
    
  } catch (error) {
    console.error('❌ Error in getUnitStats:', error);
    throw error;
  }
}

module.exports = {
  cleanupUnusedUnits,
  deleteAllUnits,
  getUnitStats
};

