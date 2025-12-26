const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const utils = require('../../utils/utils');
const User = require('../../models/user');
const Subscription = require('../../models/subscription');
const stripeBillingPortal = require('../../services/stripeBillingPortalService');

/**
 * Invoice Management Controller
 * Handles Stripe invoice operations for users
 */

/**
 * Get all invoices for the authenticated user
 * GET /user/getInvoices
 */
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, starting_after, ending_before, status } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: 'User not found',
        code: 404
      });
    }

    // Get user's Stripe customer ID from subscriptions
    const subscription = await Subscription.findOne({
      user_id: userId,
      source: 'stripe',
      stripe_customer_id: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    if (!subscription || !subscription.stripe_customer_id) {
      return res.status(200).json({
        code: 200,
        message: 'No Stripe customer found',
        data: [],
        count: 0
      });
    }

    // Build query parameters for Stripe
    const queryParams = {
      customer: subscription.stripe_customer_id,
      limit: parseInt(limit, 10) || 10
    };

    if (starting_after) {
      queryParams.starting_after = starting_after;
    }
    if (ending_before) {
      queryParams.ending_before = ending_before;
    }
    if (status) {
      queryParams.status = status; // 'paid', 'open', 'void', 'uncollectible', 'draft'
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list(queryParams);

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount_due: invoice.amount_due / 100, // Convert from cents
      amount_paid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      subscription_id: invoice.subscription,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      payment_intent: invoice.payment_intent,
      description: invoice.description || invoice.lines?.data[0]?.description || '',
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
      created: new Date(invoice.created * 1000)
    }));

    return res.status(200).json({
      code: 200,
      message: 'Invoices fetched successfully',
      data: formattedInvoices,
      count: invoices.data.length,
      has_more: invoices.has_more,
      starting_after: invoices.data.length > 0 ? invoices.data[invoices.data.length - 1].id : null
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return utils.handleError(res, {
      message: 'Failed to fetch invoices',
      code: 500,
      error: error.message
    });
  }
};

/**
 * Get single invoice details
 * GET /user/getInvoice/:invoiceId
 */
exports.getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user._id;

    // Verify invoice belongs to user
    const subscription = await Subscription.findOne({
      user_id: userId,
      source: 'stripe',
      stripe_customer_id: { $exists: true, $ne: null }
    });

    if (!subscription || !subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'No Stripe customer found',
        code: 404
      });
    }

    // Fetch invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Verify invoice belongs to user's customer
    if (invoice.customer !== subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'Invoice not found',
        code: 404
      });
    }

    // Format invoice
    const formattedInvoice = {
      id: invoice.id,
      number: invoice.number,
      amount_due: invoice.amount_due / 100,
      amount_paid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      subscription_id: invoice.subscription,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      payment_intent: invoice.payment_intent,
      description: invoice.description || invoice.lines?.data[0]?.description || '',
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
      created: new Date(invoice.created * 1000),
      lines: invoice.lines.data.map(line => ({
        id: line.id,
        description: line.description,
        amount: line.amount / 100,
        currency: line.currency.toUpperCase(),
        period: {
          start: line.period.start ? new Date(line.period.start * 1000) : null,
          end: line.period.end ? new Date(line.period.end * 1000) : null
        }
      }))
    };

    return res.status(200).json({
      code: 200,
      message: 'Invoice fetched successfully',
      data: formattedInvoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    if (error.type === 'StripeInvalidRequestError' && error.statusCode === 404) {
      return utils.handleError(res, {
        message: 'Invoice not found',
        code: 404
      });
    }
    return utils.handleError(res, {
      message: 'Failed to fetch invoice',
      code: 500,
      error: error.message
    });
  }
};

/**
 * Pay invoice (creates billing portal session for payment)
 * POST /user/payInvoice/:invoiceId
 */
exports.payInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user._id;

    // Verify invoice belongs to user
    const subscription = await Subscription.findOne({
      user_id: userId,
      source: 'stripe',
      stripe_customer_id: { $exists: true, $ne: null }
    });

    if (!subscription || !subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'No Stripe customer found',
        code: 404
      });
    }

    // Fetch invoice to verify it belongs to user
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    if (invoice.customer !== subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'Invoice not found',
        code: 404
      });
    }

    // Check if invoice can be paid
    if (invoice.status === 'paid') {
      return utils.handleError(res, {
        message: 'Invoice is already paid',
        code: 400
      });
    }

    if (invoice.status === 'void') {
      return utils.handleError(res, {
        message: 'Invoice is void and cannot be paid',
        code: 400
      });
    }

    // Create billing portal session for payment
    const returnUrl = process.env.APP_URL || process.env.FRONTEND_PROD_URL || 'http://localhost:3000';
    const cleanReturnUrl = returnUrl.replace(/\/+$/, '');
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${cleanReturnUrl}/my-account/invoices?invoice=${invoiceId}`
    });

    return res.status(200).json({
      code: 200,
      message: 'Billing portal session created',
      data: {
        url: portalSession.url
      }
    });

  } catch (error) {
    console.error('Error creating payment session:', error);
    return utils.handleError(res, {
      message: 'Failed to create payment session',
      code: 500,
      error: error.message
    });
  }
};

/**
 * Get billing portal URL for invoice management
 * GET /user/getBillingPortal
 */
exports.getBillingPortal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { returnUrl = 'my-account/invoices' } = req.query;

    const subscription = await Subscription.findOne({
      user_id: userId,
      source: 'stripe',
      stripe_customer_id: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    if (!subscription || !subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'No Stripe customer found',
        code: 404
      });
    }

    const portalUrl = await stripeBillingPortal.getBillingPortalUrl(
      subscription.stripe_customer_id,
      returnUrl
    );

    return res.status(200).json({
      code: 200,
      message: 'Billing portal URL generated',
      data: {
        url: portalUrl
      }
    });

  } catch (error) {
    console.error('Error getting billing portal:', error);
    return utils.handleError(res, {
      message: 'Failed to get billing portal URL',
      code: 500,
      error: error.message
    });
  }
};

/**
 * Reactivate subscription (creates billing portal session)
 * POST /user/reactivateSubscription/:subscriptionId
 */
exports.reactivateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user._id;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user_id: userId,
      source: 'stripe'
    });

    if (!subscription) {
      return utils.handleError(res, {
        message: 'Subscription not found',
        code: 404
      });
    }

    if (!subscription.stripe_customer_id) {
      return utils.handleError(res, {
        message: 'No Stripe customer found for this subscription',
        code: 404
      });
    }

    // Create billing portal session for reactivation
    const returnUrl = process.env.APP_URL || process.env.FRONTEND_PROD_URL || 'http://localhost:3000';
    const cleanReturnUrl = returnUrl.replace(/\/+$/, '');
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${cleanReturnUrl}/my-account/subscriptions`
    });

    return res.status(200).json({
      code: 200,
      message: 'Billing portal session created for reactivation',
      data: {
        url: portalSession.url
      }
    });

  } catch (error) {
    console.error('Error creating reactivation session:', error);
    return utils.handleError(res, {
      message: 'Failed to create reactivation session',
      code: 500,
      error: error.message
    });
  }
};

