/**
 * Utility to generate missing enquiry_id (bso-enq-xxxxx) for existing enquiries.
 * Run on deploy/startup so every enquiry has a BSO-format enquiry_id.
 */

const Enquiry = require("../models/Enquiry");
const { generateEnquiryId } = require("./enquiryIdGenerator");

/** Pattern for valid BSO enquiry ID: bso-enq- followed by alphanumeric suffix */
const BSO_ENQUIRY_ID_PATTERN = /^bso-enq-[a-z0-9]+$/i;

/**
 * Check if an enquiry has a valid BSO-format enquiry_id
 */
function hasValidEnquiryId(enquiry) {
  const id = enquiry?.enquiry_id;
  if (id == null || typeof id !== "string" || id.trim() === "") return false;
  return BSO_ENQUIRY_ID_PATTERN.test(id.trim());
}

/**
 * Find all enquiries that don't have enquiry_id in BSO format
 */
async function findEnquiriesWithoutEnquiryId() {
  return Enquiry.find({
    $or: [
      { enquiry_id: { $exists: false } },
      { enquiry_id: null },
      { enquiry_id: "" },
      { enquiry_id: { $not: { $regex: BSO_ENQUIRY_ID_PATTERN } } },
    ],
  }).lean();
}

/**
 * Generate and assign missing enquiry_id for all enquiries that don't have BSO format
 */
async function generateMissingEnquiryIds() {
  try {
    console.log("🔍 Checking for enquiries without enquiry_id (bso-enq-*)...");

    const enquiriesWithoutId = await findEnquiriesWithoutEnquiryId();

    if (enquiriesWithoutId.length === 0) {
      console.log("✅ All enquiries have enquiry_id in BSO format");
      return { updated: 0, total: 0 };
    }

    console.log(`📝 Found ${enquiriesWithoutId.length} enquiries without BSO format enquiry_id`);

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
      enquiry_id: { $regex: BSO_ENQUIRY_ID_PATTERN },
    });
    const withoutValidId = total - withValidId;

    console.log(`Total enquiries: ${total}`);
    console.log(`With BSO format enquiry_id: ${withValidId}`);
    console.log(`Without BSO format enquiry_id: ${withoutValidId}`);

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
  BSO_ENQUIRY_ID_PATTERN,
};
