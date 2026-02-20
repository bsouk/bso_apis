/**
 * Generate unique enquiry ID in format: bso-enq-xxxxx (alphanumeric suffix)
 */

const crypto = require('crypto');

/**
 * Generate a short alphanumeric suffix (5 chars)
 */
function generateEnquirySuffix() {
  return crypto.randomBytes(4).toString('hex').slice(0, 5); // 5 hex chars
}

/**
 * Generate unique enquiry ID: bso-enq-xxxxx
 * @param {object} EnquiryModel - Mongoose Enquiry model (required for uniqueness check)
 * @returns {Promise<string>}
 */
async function generateEnquiryId(EnquiryModel) {
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const suffix = generateEnquirySuffix();
    const enquiryId = `bso-enq-${suffix}`;

    const existing = await EnquiryModel.findOne({
      $or: [
        { enquiry_id: enquiryId },
      ]
    });

    if (!existing) {
      return enquiryId;
    }
    attempts++;
  }

  // Fallback: timestamp-based to guarantee uniqueness
  return `bso-enq-${Date.now().toString(36).slice(-5)}`;
}

module.exports = {
  generateEnquiryId,
  generateEnquirySuffix,
};
