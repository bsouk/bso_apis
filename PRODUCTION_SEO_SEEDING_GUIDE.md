# Production SEO Seeding Guide

## Overview
This guide explains how to safely seed SEO pages data into your production database.

---

## 📁 Script Location
```
/bso_apis/scripts/seedSEOProduction.js
```

---

## 🚀 How to Run in Production

### Step 1: SSH into Production Server
```bash
ssh your-user@your-production-server.com
```

### Step 2: Navigate to Project Directory
```bash
cd /path/to/your/bso_apis
```

### Step 3: Ensure Environment Variables are Set
Verify your `.env` file has the production MongoDB URI:
```bash
cat .env | grep MONGO_URI
```

Should show something like:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
```

### Step 4: Run the Seeding Script
```bash
node scripts/seedSEOProduction.js
```

---

## 🎯 What the Script Does

1. **Connects to Production Database**
   - Uses MONGO_URI from environment variables
   - Shows connection details (database name, host)

2. **Checks for Existing Entries**
   - Looks for existing SEO pages by slug
   - Skips pages that already exist
   - Only adds new pages

3. **Seeds Default Data**
   - Adds 15 default SEO page entries
   - Covers all major frontend routes

4. **Provides Detailed Output**
   - Shows what was added, skipped, or errored
   - Summary statistics at the end

5. **Safe Error Handling**
   - Graceful handling of errors
   - Won't crash if data already exists
   - Won't corrupt existing data

---

## 📊 Expected Output

### First Run (No Existing Data):
```
═══════════════════════════════════════════════════════
      BSO - Production SEO Pages Seeding Script       
═══════════════════════════════════════════════════════

⚠️  WARNING: This script will add SEO data to PRODUCTION database!
📋 Environment: production

✅ MongoDB connected successfully
📍 Database: bso_production
🔗 Host: cluster0.mongodb.net

🌱 Starting SEO pages seeding...

✅ Added "Home Page" (home)
✅ Added "Sign In" (sign-in)
✅ Added "About Us" (about-us)
✅ Added "Contact Us" (contact-us)
✅ Added "How It Works" (how-it-works)
✅ Added "FAQ" (faq)
✅ Added "Terms and Conditions" (terms-conditions)
✅ Added "Privacy Policy" (privacy-policy)
✅ Added "Product List" (product-list)
✅ Added "Search Jobs" (search-job)
✅ Added "Post a Job" (post-job)
✅ Added "Subscription Plan" (subscription-plan)
✅ Added "Send Enquiry" (send-enquiry)
✅ Added "Product Query List" (product-query-list)
✅ Added "Logistic Query List" (logistic-query-list)

🎉 SEO seeding completed!
📊 Summary:
   ✅ Added: 15
   ⏭️  Skipped: 0
   ❌ Errors: 0
   📝 Total processed: 15

✅ Script completed successfully!
✅ MongoDB disconnected
```

### Subsequent Runs (Data Already Exists):
```
🌱 Starting SEO pages seeding...

⏭️  Skipping "Home Page" - already exists
⏭️  Skipping "Sign In" - already exists
⏭️  Skipping "About Us" - already exists
... (all skipped)

🎉 SEO seeding completed!
📊 Summary:
   ✅ Added: 0
   ⏭️  Skipped: 15
   ❌ Errors: 0
   📝 Total processed: 15
```

---

## 🔒 Safety Features

### 1. **No Data Loss**
- Script never deletes existing data
- Only adds new entries
- Checks for duplicates before inserting

### 2. **Duplicate Prevention**
- Checks by `slug` field (unique identifier)
- Won't override existing SEO pages
- Safe to run multiple times

### 3. **Error Handling**
- Graceful error handling
- Continues even if one entry fails
- Shows summary of all operations

### 4. **Interruptible**
- Can be stopped with Ctrl+C
- Properly disconnects from database
- No orphaned connections

---

## 📝 What Gets Seeded

The script seeds 15 default SEO pages:

1. **Home Page** (`/`)
2. **Sign In** (`/sign-in`)
3. **About Us** (`/about-us`)
4. **Contact Us** (`/contact-us`)
5. **How It Works** (`/how-it-works`)
6. **FAQ** (`/faq`)
7. **Terms and Conditions** (`/terms-conditions`)
8. **Privacy Policy** (`/privacy-policy`)
9. **Product List** (`/product-list`)
10. **Search Jobs** (`/search-job`)
11. **Post a Job** (`/post-job`)
12. **Subscription Plan** (`/subscription-plan`)
13. **Send Enquiry** (`/send-enquiry`)
14. **Product Query List** (`/product-query-list`)
15. **Logistic Query List** (`/logistic-query-list`)

Each entry includes:
- Page name and slug
- SEO title (max 60 chars)
- Meta description (max 160 chars)
- Keywords
- Open Graph tags (optional)
- Twitter Card tags (optional)
- Robots directive
- Status (active/inactive)

---

## ⚙️ npm Script

You can also add this to your `package.json` scripts:

```json
{
  "scripts": {
    "seed-seo-production": "node scripts/seedSEOProduction.js"
  }
}
```

Then run with:
```bash
npm run seed-seo-production
```

---

## 🔧 Customization

### Add More SEO Pages:
Edit `scripts/seedSEOProduction.js` and add entries to the `defaultSeoPages` array:

```javascript
{
  page_name: 'Your Page Name',
  slug: 'your-page-slug',
  title: 'SEO Title (max 60 chars)',
  description: 'Meta description (max 160 chars)',
  keywords: 'keyword1, keyword2, keyword3',
  og_title: 'Open Graph Title',
  og_description: 'OG Description',
  og_type: 'website',
  twitter_card: 'summary_large_image',
  robots: 'index, follow',
  status: 'active'
}
```

### Update Existing Pages:
Use the admin panel at:
```
https://your-admin-domain.com/general-management/seo-pages/listings
```

---

## 🐛 Troubleshooting

### Issue: "MongoDB connection error"
**Solution**: Check your `.env` file has correct MONGO_URI

### Issue: "ValidationError: title is longer than maximum"
**Solution**: Ensure titles are under 60 characters

### Issue: "E11000 duplicate key error"
**Solution**: A page with that slug already exists. Either:
- Delete the existing page via admin panel
- Change the slug in the script
- Let it skip (script handles this automatically)

### Issue: "UnhandledPromiseRejection"
**Solution**: Check your MongoDB connection and credentials

---

## ✅ Verification

After running the script, verify in admin panel:

1. Log in to admin panel
2. Go to: General Management → SEO Pages
3. You should see 15 entries
4. All should have status "Active"
5. Test on frontend by visiting any page and checking `<head>` tags

Or verify via API:
```bash
curl https://your-api-domain.com/user/getAllActiveSeoPages
```

---

## 📌 Important Notes

1. **Run Once**: This script is designed to be run once during initial production setup
2. **Safe to Re-run**: If data exists, it will skip without errors
3. **No Downtime**: Running this script doesn't affect running applications
4. **Immediate Effect**: Frontend will start using SEO data immediately after seeding
5. **Manage via Admin**: After seeding, manage all SEO via the admin panel

---

## 🔐 Production Best Practices

1. **Backup First**: Always backup your database before running scripts
2. **Test Connection**: Verify you can connect to production DB
3. **Check Environment**: Ensure you're pointing to the correct database
4. **Review Logs**: Check the output for any errors
5. **Verify Results**: Test the frontend after seeding

---

## 📞 Support

If you encounter any issues:
1. Check the error message in console
2. Verify MongoDB connection
3. Check .env file configuration
4. Review the script logs
5. Contact your development team

---

**Script Version**: 1.0.0  
**Last Updated**: October 24, 2025  
**Status**: ✅ Production Ready

