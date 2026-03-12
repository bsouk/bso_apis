const Enquiry = require("../models/Enquiry");

async function autoApprovePendingEnquiries() {
  const pendingPattern = /^\s*pending\s*$/i;

  // 1) Convert workflow status from pending -> approved
  const pendingStatusResult = await Enquiry.updateMany(
    { status: { $regex: pendingPattern } },
    { $set: { status: "approved", is_approved: "approved" } }
  );

  // 2) Normalize legacy approval flag if it was left pending
  const pendingApprovalFlagResult = await Enquiry.updateMany(
    { is_approved: { $regex: pendingPattern } },
    { $set: { is_approved: "approved" } }
  );

  const statusUpdated = pendingStatusResult?.modifiedCount || 0;
  const approvalFlagUpdated = pendingApprovalFlagResult?.modifiedCount || 0;

  return {
    statusUpdated,
    approvalFlagUpdated,
    totalUpdated: statusUpdated + approvalFlagUpdated,
  };
}

module.exports = { autoApprovePendingEnquiries };
