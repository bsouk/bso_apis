# Enquiry Management - Complete Flow Documentation

## Overview

This document describes the complete flow for Enquiry Management in the BSO platform, covering both buyer-created enquiries and admin-created manual enquiries on behalf of buyers.

---

## Status Values

| Status | Description | Triggered By |
|--------|-------------|--------------|
| `pending` | Enquiry created, awaiting approval | Enquiry creation |
| `approved` | Enquiry approved by admin | Admin approval |
| `rejected` | Enquiry rejected by admin | Admin rejection |
| `supplier_quote_accepted` | Supplier quote selected | Admin accepts supplier quote |
| `logistics_quote_accepted` | Logistics quote selected | Admin accepts logistics quote |
| `final_quote_sent` | Final quote sent to buyer | Admin sends final quote |
| `payment_received` | Payment completed, order created | Buyer payment |
| `shipment_ready` | Supplier marks goods ready | Supplier action |
| `logistic_pickup` | Logistics picked up goods | Logistics action |
| `delivered` | Order delivered to buyer | Delivery confirmation |
| `self_delivered` | Buyer self-picked the order | Self-pickup confirmation |
| `cancelled` | Enquiry cancelled | Admin/Buyer cancellation |

---

## Phase 1: Enquiry Creation

### 1.1 Buyer Creates Enquiry (Frontend)

**Endpoint:** `POST /user/addEnquiry`

**Flow:**
1. Buyer fills enquiry form with spare parts details
2. System creates enquiry with:
   - `status: "pending"`
   - `is_approved: "pending"`
3. Emails sent:
   - Admin: New enquiry notification
4. Activity Log: "Enquiry created by buyer [buyer_name]"

### 1.2 Admin Creates Manual Enquiry (on behalf of buyer)

**Endpoint:** `POST /admin/createManualEnquiry`

**Flow:**
1. Admin fills enquiry form on behalf of buyer
2. System creates enquiry with:
   - `status: "approved"` (auto-approved)
   - `is_approved: "approved"`
   - `created_by_admin: admin_id`
3. Emails sent:
   - Buyer: Enquiry confirmation
   - Suppliers: New enquiry available (if auto-send enabled)
4. Activity Log: "Manual enquiry created by admin [admin_name] on behalf of [buyer_name]"

---

## Phase 2: Enquiry Approval (Admin Only)

**Endpoint:** `PATCH /admin/approveRejectEnquiry`

**Flow:**
1. Admin reviews enquiry details
2. Admin approves or rejects enquiry
3. System updates:
   - `is_approved: "approved"` or `"rejected"`
   - `status: "approved"` or `"rejected"`
4. Emails sent:
   - Buyer: "Your enquiry has been approved/rejected"
   - Suppliers: "New enquiry available for quotation" (if approved)
5. Activity Log: "Enquiry approved/rejected by admin [admin_name]"

---

## Phase 3: Supplier Quotations

### 3.1 Supplier Submits Quote (Frontend)

**Endpoint:** `POST /user/addenquiryquotes`

**Flow:**
1. Supplier creates quote with prices, delivery time, payment terms
2. Quote saved with:
   - `is_selected: false`
   - `is_admin_approved: false`
3. Emails sent:
   - Buyer: "New supplier quote received"
   - Admin: "New supplier quote for review"
4. Activity Log: "Supplier quote submitted by [supplier_name]"

### 3.2 Admin Creates Supplier Quote (on behalf of supplier)

**Endpoint:** `POST /admin/createSupplierQuote`

**Flow:**
1. Admin creates quote on behalf of supplier
2. Quote saved with:
   - `is_selected: false`
   - `is_admin_approved: true`
   - `created_by_admin: admin_id`
3. Emails sent:
   - Supplier: "A quote has been created on your behalf"
   - Buyer: "New supplier quote received"
4. Activity Log: "Supplier quote created by admin [admin_name] on behalf of [supplier_name]"

### 3.3 Admin Accepts/Rejects Supplier Quote

**Endpoint:** `POST /admin/acceptsupplierEnquiry` or `POST /admin/rejectsupplierEnquiry`

**Flow:**
1. Admin reviews and accepts/rejects supplier quote
2. System updates:
   - Quote: `is_selected: true/false`, `status: "accepted"/"rejected"`
   - Enquiry: `selected_supplier.quote_id: quote_id`
   - Enquiry Status: `"supplier_quote_accepted"` (if accepted)
3. Emails sent:
   - Supplier: "Your quote has been accepted/rejected"
   - Buyer: "A supplier quote has been selected for your enquiry"
4. Activity Log: "Supplier quote accepted/rejected by admin [admin_name]"

---

## Phase 4: Logistics Quotations

### 4.1 Logistics Submits Quote (Frontend)

**Endpoint:** `POST /user/addLogisticsQuote`

**Flow:**
1. Logistics provider creates shipping quote
2. Quote saved with:
   - `is_selected: false`
3. Emails sent:
   - Buyer: "New logistics quote received"
   - Admin: "New logistics quote for review"
4. Activity Log: "Logistics quote submitted by [logistics_name]"

### 4.2 Admin Creates Logistics Quote (on behalf of logistics)

**Endpoint:** `POST /admin/createLogisticsQuote`

**Flow:**
1. Admin creates logistics quote on behalf of provider
2. Quote saved with:
   - `is_selected: false`
   - `created_by_admin: admin_id`
3. Emails sent:
   - Logistics: "A quote has been created on your behalf"
   - Buyer: "New logistics quote received"
4. Activity Log: "Logistics quote created by admin [admin_name] on behalf of [logistics_name]"

### 4.3 Admin Accepts/Rejects Logistics Quote

**Endpoint:** `PUT /admin/acceptLogisticQuote/:id` or `POST /admin/rejectLogisticQuote`

**Flow:**
1. Admin reviews and accepts/rejects logistics quote
2. System updates:
   - Quote: `is_selected: true/false`, `status: "accepted"/"rejected"`
   - Enquiry: `selected_logistics.quote_id: quote_id`
   - Enquiry Status: `"logistics_quote_accepted"` (if accepted)
3. Emails sent:
   - Logistics: "Your quote has been accepted/rejected"
   - Buyer: "A logistics quote has been selected for your enquiry"
4. Activity Log: "Logistics quote accepted/rejected by admin [admin_name]"

---

## Phase 5: Final Quote & Payment

### 5.1 Admin Sends Final Quote to Buyer

**Endpoint:** `POST /admin/sendFinalQuoteToBuyer` (NEW)

**Flow:**
1. Admin sets:
   - Final prices with admin margins
   - Selected payment terms
   - Any additional charges/discounts
2. System updates:
   - Enquiry: `admin_grand_total`, `admin_price`, `selected_payment_terms`
   - Enquiry Status: `"final_quote_sent"`
3. Emails sent:
   - Buyer: "Final quote ready for review - please proceed to payment"
4. Activity Log: "Final quote sent to buyer by admin [admin_name]"

### 5.2 Buyer Accepts Final Quote & Makes Payment

**Endpoint:** `POST /user/makePayment`

**Flow:**
1. Buyer reviews final quote on frontend
2. Buyer selects payment schedule (if applicable)
3. Buyer makes payment
4. System updates:
   - Enquiry Status: `"payment_received"`
   - Order created
5. Emails sent:
   - Buyer: "Payment confirmation"
   - Supplier: "Order confirmed - prepare shipment"
   - Logistics: "Prepare for pickup" (if delivery selected)
   - Admin: "New order placed"
6. Activity Log: "Payment received, order created"

---

## Phase 6: Shipment & Delivery

### 6.1 Supplier Marks Shipment Ready

**Endpoint:** `POST /user/markShipmentReady`

**Flow:**
1. Supplier confirms goods are ready for collection
2. System updates:
   - Enquiry Status: `"shipment_ready"`
   - Quote Status: `"shipment_ready"`
3. Emails sent:
   - Logistics: "Shipment ready for pickup"
   - Buyer: "Your order is ready for shipment"
4. Activity Log: "Shipment marked ready by supplier [supplier_name]"

### 6.2 Logistics Picks Up Shipment

**Endpoint:** `POST /user/logisticsPickup`

**Flow:**
1. Logistics confirms pickup
2. System updates:
   - Enquiry Status: `"logistic_pickup"`
3. Emails sent:
   - Buyer: "Your order has been picked up by logistics"
   - Supplier: "Shipment picked up"
4. Activity Log: "Shipment picked up by logistics [logistics_name]"

### 6.3 Delivery Completed

**Endpoint:** `POST /user/confirmDelivery`

**Flow:**
1. Logistics/Buyer confirms delivery (OTP verification if required)
2. System updates:
   - Enquiry Status: `"delivered"`
   - Order Status: `"delivered"`
3. Emails sent:
   - All parties: "Order delivered successfully"
4. Activity Log: "Order delivered successfully"

### 6.4 Self-Pickup (Alternative)

**Endpoint:** `POST /user/confirmSelfPickup`

**Flow:**
1. Buyer picks up from supplier location
2. OTP verification required
3. System updates:
   - Enquiry Status: `"self_delivered"`
   - Order Status: `"delivered"`
4. Emails sent:
   - All parties: "Order self-picked successfully"
5. Activity Log: "Order self-picked by buyer [buyer_name]"

---

## Activity Logs Structure

Activity logs are stored within the enquiry document in the `activity_logs` array:

```javascript
activity_logs: [
  {
    action: "enquiry_created",
    description: "Enquiry created by buyer John Doe",
    performed_by: {
      user_id: ObjectId,
      user_type: "buyer" | "supplier" | "logistics" | "admin",
      name: "John Doe"
    },
    on_behalf_of: {  // Only for admin actions on behalf of others
      user_id: ObjectId,
      user_type: "buyer" | "supplier" | "logistics",
      name: "Jane Smith"
    },
    previous_status: "pending",
    new_status: "approved",
    metadata: {},  // Additional data specific to action
    created_at: ISODate
  }
]
```

---

## Email Templates Used

| Action | Template | Recipients |
|--------|----------|------------|
| Enquiry Created | `enquiryCreated` | Admin |
| Enquiry Approved | `enquiryApproved` | Buyer, Suppliers |
| Enquiry Rejected | `enquiryRejected` | Buyer |
| Supplier Quote Created | `supplierQuoteCreated` | Buyer, Supplier |
| Supplier Quote Accepted | `SupplierQuoteAccepted` | Supplier, Buyer |
| Supplier Quote Rejected | `SupplierQuoteRejected` | Supplier, Buyer |
| Logistics Quote Created | `logisticsQuoteCreated` | Buyer, Logistics |
| Logistics Quote Accepted | `LogisticsQuoteAccepted` | Logistics, Buyer |
| Logistics Quote Rejected | `LogisticsQuoteRejected` | Logistics, Buyer |
| Final Quote Sent | `finalQuoteSent` | Buyer |
| Payment Received | `paymentConfirmation` | Buyer, Supplier, Logistics |
| Shipment Ready | `shipmentReady` | Buyer, Logistics |
| Logistics Pickup | `logisticsPickup` | Buyer, Supplier |
| Order Delivered | `orderDelivered` | All parties |

---

## API Endpoints Summary

### Enquiry Management
- `POST /admin/createManualEnquiry` - Create enquiry on behalf of buyer
- `PATCH /admin/approveRejectEnquiry` - Approve/reject enquiry
- `POST /admin/sendFinalQuoteToBuyer` - Send final quote to buyer (NEW)

### Supplier Quotes
- `POST /admin/createSupplierQuote` - Create quote on behalf of supplier
- `POST /admin/acceptsupplierEnquiry` - Accept supplier quote
- `POST /admin/rejectsupplierEnquiry` - Reject supplier quote

### Logistics Quotes
- `POST /admin/createLogisticsQuote` - Create quote on behalf of logistics
- `PUT /admin/acceptLogisticQuote/:id` - Accept logistics quote
- `POST /admin/rejectLogisticQuote` - Reject logistics quote

---

## Frontend URLs for Emails

| Page | URL Pattern |
|------|-------------|
| Enquiry Review (Buyer) | `/enquiry-review-page/{enquiry_id}` |
| Quote Review (Supplier) | `/quote-review-page/{quote_id}` |
| Quote Review (Logistics) | `/quote-review-page-logistics/{quote_id}` |
| Quotation Management (Admin) | `/quotation-management` |
| Enquiry Management (Admin) | `/enquiry-management` |

---

## Implementation Notes

1. **On Behalf Of Actions**: All admin actions on behalf of users should:
   - Store `created_by_admin` field with admin ID
   - Include proper activity log with `on_behalf_of` details
   - Send appropriate emails to the actual user

2. **Status Transitions**: Status can only transition in the defined order (enforced in API)

3. **Email URLs**: Always use `process.env.FRONTEND_PROD_URL` without trailing slash conflicts

4. **Activity Logs**: Every status change must create an activity log entry

---

*Last Updated: November 30, 2025*



