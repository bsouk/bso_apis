/**
 * Utility to generate/assign enquiry_id in format Enq-<5 digits> (e.g. Enq-12345).
 * Run on deploy/startup so every enquiry has Enq-12345 format.
 * Also converts existing old-format IDs (Enq-1234567890) to the new 5-digit format.
 */

const Enquiry = require("../models/Enquiry");
const { generateEnquiryId } = require("./enquiryIdGenerator");

/** Pattern for valid enquiry ID: Enq- followed by exactly 5 digits */
const ENQUIRY_ID_PATTERN = /^Enq-\d{5}$/;

/** Old format (10 digits) - these are migrated to 5-digit on deploy */
const ENQUIRY_ID_OLD_PATTERN = /^Enq-\d{10}$/;

/**
 * Check if an enquiry has a valid Enq-<5 digits> format enquiry_id
 */
function hasValidEnquiryId(enquiry) {
  const id = enquiry?.enquiry_id;
  if (id == null || typeof id !== "string" || id.trim() === "") return false;
  return ENQUIRY_ID_PATTERN.test(id.trim());
}

/**
 * Find all enquiries that don't have enquiry_id in Enq-<5 digits> format.
 * Includes: missing, empty, or old 10-digit format (Enq-1234567890) so they get converted on deploy.
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
 * Generate and assign enquiry_id (Enq-<5 digits>) for all enquiries that don't have the new format.
 * On deploy: missing/empty get new IDs; existing Enq-1234567890 (10-digit) are converted to Enq-12345 (5-digit).
 */
async function generateMissingEnquiryIds() {
  try {
    console.log("🔍 Checking for enquiries without enquiry_id (Enq-<5 digits>)...");

    const enquiriesWithoutId = await findEnquiriesWithoutEnquiryId();

    if (enquiriesWithoutId.length === 0) {
      console.log("✅ All enquiries have enquiry_id in Enq-12345 format");
      return { updated: 0, total: 0 };
    }

    const oldFormatCount = enquiriesWithoutId.filter((e) =>
      e.enquiry_id && typeof e.enquiry_id === "string" && ENQUIRY_ID_OLD_PATTERN.test(e.enquiry_id.trim())
    ).length;
    if (oldFormatCount > 0) {
      console.log(`📝 Converting ${oldFormatCount} enquiries from Enq-XXXXXXXXXX to Enq-XXXXX format`);
    }
    console.log(`📝 Found ${enquiriesWithoutId.length} enquiries to assign/convert to Enq-12345 format`);

    let updated = 0;

    for (const doc of enquiriesWithoutId) {
      try {
        const newEnquiryId = await generateEnquiryId(Enquiry);
        await Enquiry.updateOne(
          { _id: doc._id },
          { $set: { enquiry_id: newEnquiryId } }
        );
        updated++;
        const ref = doc.enquiry_number || doc.enquiry_unique_id || doc.enquiry_id || doc._id;
        console.log(`✅ Enquiry ${ref} → ${newEnquiryId}`);
      } catch (err) {
        console.error(`❌ Error updating enquiry ${doc._id}:`, err.message);
      }
    }

    console.log(`🎉 Successfully assigned enquiry_id to ${updated}/${enquiriesWithoutId.length} enquiries (Enq-12345 format)`);
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
    console.log(`With Enq-12345 format enquiry_id: ${withValidId}`);
    console.log(`Without Enq-12345 format enquiry_id: ${withoutValidId}`);

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
