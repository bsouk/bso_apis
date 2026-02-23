/**
 * Utility to generate missing enquiry_id (Enq-<10 digits>) for existing enquiries.
 * Run on deploy/startup so every enquiry has the Enq-1234567890 format.
 */

const Enquiry = require("../models/Enquiry");
const { generateEnquiryId } = require("./enquiryIdGenerator");

/** Pattern for valid enquiry ID: Enq- followed by exactly 10 digits */
const ENQUIRY_ID_PATTERN = /^Enq-\d{10}$/;

/**
 * Check if an enquiry has a valid Enq-<10 digits> format enquiry_id
 */
function hasValidEnquiryId(enquiry) {
  const id = enquiry?.enquiry_id;
  if (id == null || typeof id !== "string" || id.trim() === "") return false;
  return ENQUIRY_ID_PATTERN.test(id.trim());
}

/**
 * Find all enquiries that don't have enquiry_id in Enq-<10 digits> format
 */
async function findEnquiriesWithoutEnquiryId() {
  return Enquiry.find({
    $or: [
      { enquiry_id: { $exists: false } },
      { enquiry_id: null },
      { enquiry_id: "" },
      { enquiry_id: { $not: { $regex: ENQUIRY_ID_PATTERN } } },
    ],
  }).lean();
}

/**
 * Generate and assign missing enquiry_id for all enquiries that don't have Enq-<10 digits> format
 */
async function generateMissingEnquiryIds() {
  try {
    console.log("🔍 Checking for enquiries without enquiry_id (Enq-<10 digits>)...");

    const enquiriesWithoutId = await findEnquiriesWithoutEnquiryId();

    if (enquiriesWithoutId.length === 0) {
      console.log("✅ All enquiries have enquiry_id in Enq-1234567890 format");
      return { updated: 0, total: 0 };
    }

    console.log(`📝 Found ${enquiriesWithoutId.length} enquiries without Enq- format enquiry_id`);

    let updated = 0;

    for (const doc of enquiriesWithoutId) {
      try {
        const newEnquiryId = await generateEnquiryId(Enquiry);
        await Enquiry.updateOne(
          { _id: doc._id },
          { $set: { enquiry_id: newEnquiryId } }
        );
        updated++;
        const ref = doc.enquiry_number || doc.enquiry_unique_id || doc._id;
        console.log(`✅ Enquiry ${ref} → ${newEnquiryId}`);
      } catch (err) {
        console.error(`❌ Error updating enquiry ${doc._id}:`, err.message);
      }
    }

    console.log(`🎉 Successfully assigned enquiry_id to ${updated}/${enquiriesWithoutId.length} enquiries`);
    return { updated, total: enquiriesWithoutId.length };
  } catch (error) {
    console.error("❌ Error in generateMissingEnquiryIds:", error);
    throw error;
  }
}

/**
 * Validate current state (for scripts/reporting)
 */
async function validateAllEnquiryIds() {
  try {
    const total = await Enquiry.countDocuments();
    const withValidId = await Enquiry.countDocuments({
      enquiry_id: { $regex: ENQUIRY_ID_PATTERN },
    });
    const withoutValidId = total - withValidId;

    console.log(`Total enquiries: ${total}`);
    console.log(`With Enq- format enquiry_id: ${withValidId}`);
    console.log(`Without Enq- format enquiry_id: ${withoutValidId}`);

    return { total, withValidId, withoutValidId };
  } catch (error) {
    console.error("❌ Error in validateAllEnquiryIds:", error);
    throw error;
  }
}

module.exports = {
  generateMissingEnquiryIds,
  validateAllEnquiryIds,
  findEnquiriesWithoutEnquiryId,
  hasValidEnquiryId,
  ENQUIRY_ID_PATTERN,
  BSO_ENQUIRY_ID_PATTERN: ENQUIRY_ID_PATTERN, // backward compatibility
};
