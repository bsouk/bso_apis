# 🔐 Frontend Login Credentials - All Roles User

**Date:** January 2025  
**User:** User with access to ALL roles

---

## ✅ USER FOUND

### User Details:

**📧 Email:** `ghufranjaleel@yopmail.com`  
**👤 Name:** Ghufran Jaleel  
**📱 Phone:** 443434344353  
**🆔 User ID:** `692b24f27f3542c72f0cfa62`  
**✅ Status:** Active

---

## 👥 ROLES (6 Total)

This user has access to **ALL** user roles:

1. ✅ **company** - Company account
2. ✅ **buyer** - Can create enquiries, view quotes, place orders
3. ✅ **supplier** - Can submit quotes, manage products, view orders
4. ✅ **logistics** - Can submit logistics quotes, manage shipments
5. ✅ **resource** - Can apply for jobs, manage profile
6. ✅ **recruiter** - Can post jobs, manage applications, hire resources

---

## 🔑 LOGIN CREDENTIALS

```
📧 Email/Phone: ghufranjaleel@yopmail.com
🔑 Password: Ghufran@123456
```

---

## 🌐 FRONTEND LOGIN

### Step 1: Open Frontend
```
http://localhost:3000/sign-in
```

### Step 2: Enter Credentials
- **Email/Phone:** `ghufranjaleel@yopmail.com`
- **Password:** `Ghufran@123456`

### Step 3: Click "Sign In"

---

## 📋 WHAT YOU CAN ACCESS

With all 6 roles, you can access:

### As Buyer:
- ✅ Create enquiries (`/send-enquiry`)
- ✅ View enquiries (`/query-management`)
- ✅ Review quotes (`/quote-review-page/:quoteId`)
- ✅ Place orders (`/checkout`)
- ✅ Manage subscriptions (`/subscription-management`)
- ✅ View payment history (`/payment-history`)

### As Supplier:
- ✅ Submit quotes (`/quote-view-page/:queryId`)
- ✅ Manage products (`/add-product`, `/inventory-product-list`)
- ✅ View quotations (`/quotation-management`)
- ✅ Manage orders (`/order-management`)

### As Logistics:
- ✅ Submit logistics quotes (`/quote-view-page-logistics/:queryId`)
- ✅ Manage logistics quotations (`/quotation-management-logistics`)
- ✅ View logistics enquiries (`/logistic-queryList`)

### As Resource:
- ✅ Search jobs (`/search-job`)
- ✅ Apply for jobs (`/job-details/:jobId`)
- ✅ View applications (`/jobs-applied`)
- ✅ Manage profile (`/profile-resource`)

### As Recruiter:
- ✅ Post jobs (`/post-a-job`)
- ✅ View posted jobs (`/jobs-posted`)
- ✅ View applications (`/applied-resources/:jobId`)
- ✅ Hire resources (`/hired-resources`)

### As Company:
- ✅ Company account features

---

## 🔄 SWITCHING ROLES

After login, you can switch between roles in the frontend to access different features based on the selected role.

---

## 🧪 TESTING IAP WITH THIS USER

You can also use this user to test IAP subscriptions:

```bash
node run_production_iap_test.js ghufranjaleel@yopmail.com
```

---

## 📝 NOTES

- User is **active** (not deleted)
- Has **6 roles** (all available roles)
- Password is set and working
- Can access all features across all roles

---

**Last Updated:** January 2025
