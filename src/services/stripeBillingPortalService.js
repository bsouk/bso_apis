const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Billing Portal Service
 * Creates billing portal sessions for customers to manage their subscriptions, invoices, and payment methods
 * 
 * Benefits:
 * - Managed by Stripe (secure, PCI compliant)
 * - Handles invoices, payment methods, subscriptions automatically
 * - Supports SCA/3D Secure
 * - No need to maintain custom payment pages
 */

/**
 * Create a billing portal session for a customer
 * This allows customers to manage their subscriptions, view invoices, update payment methods, etc.
 * 
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to return to after portal session (e.g., my-account page)
 * @returns {Object} Billing portal session with URL
 */
async function createBillingPortalSession(customerId, returnUrl) {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Get base URL from environment
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_PROD_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const cleanReturnUrl = returnUrl ? returnUrl.replace(/^\/+/, '') : 'my-account';
    const fullReturnUrl = `${cleanBaseUrl}/${cleanReturnUrl}`;

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: fullReturnUrl,
    });

    console.log(`✅ Billing portal session created for customer: ${customerId}`);
    return {
      url: session.url,
      success: true
    };

  } catch (error) {
    console.error(`❌ Error creating billing portal session:`, error);
    throw error;
  }
}

/**
 * Get billing portal URL for a user's subscription
 * 
 * @param {string} stripeCustomerId - Stripe customer ID
 * @param {string} returnUrl - Return URL after portal (default: 'my-account')
 * @returns {string} Billing portal URL
 */
async function getBillingPortalUrl(stripeCustomerId, returnUrl = 'my-account') {
  try {
    const session = await createBillingPortalSession(stripeCustomerId, returnUrl);
    return session.url;
  } catch (error) {
    console.error(`❌ Error getting billing portal URL:`, error);
    throw error;
  }
}

module.exports = {
  createBillingPortalSession,
  getBillingPortalUrl
};



