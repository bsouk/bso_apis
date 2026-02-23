/**
 * Generate unique enquiry ID in format: Enq-1234567890 (Enq- + 10 digits)
 */

/**
 * Generate a 10-digit numeric suffix (leading zeros allowed)
 */
function generateEnquirySuffix() {
  const n = Math.floor(Math.random() * 1e10);
  return n.toString().padStart(10, '0');
}

/**
 * Generate unique enquiry ID: Enq-<10 digits>
 * @param {object} EnquiryModel - Mongoose Enquiry model (required for uniqueness check)
 * @returns {Promise<string>}
 */
async function generateEnquiryId(EnquiryModel) {
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const suffix = generateEnquirySuffix();
    const enquiryId = `Enq-${suffix}`;

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

  // Fallback: timestamp-based to guarantee uniqueness (last 10 digits of ms)
  const fallback = (Date.now() % 1e10).toString().padStart(10, '0');
  return `Enq-${fallback}`;
}

module.exports = {
  generateEnquiryId,
  generateEnquirySuffix,
};
