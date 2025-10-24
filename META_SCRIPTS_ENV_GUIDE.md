# Meta Scripts Environment Variables Guide

## 🔒 Secure Key Management

Instead of storing API keys directly in the database, we use **placeholders** that get replaced with actual keys from environment variables.

---

## How It Works

### 1. **In Database** (Admin Panel):
Store scripts with placeholders:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id={{GOOGLE_ANALYTICS_ID}}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{GOOGLE_ANALYTICS_ID}}');
</script>
```

### 2. **In .env File** (Backend):
```bash
GOOGLE_ANALYTICS_ID=G-RS2H45YKSQ
GOOGLE_TAG_MANAGER_ID=GTM-PNRVGZSD
FACEBOOK_PIXEL_ID=123456789012345
```

### 3. **Backend Processing**:
- API fetches script from database
- Replaces `{{GOOGLE_ANALYTICS_ID}}` with actual value from `process.env.GOOGLE_ANALYTICS_ID`
- Sends processed script to frontend

### 4. **Frontend Receives**:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RS2H45YKSQ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-RS2H45YKSQ');
</script>
```

---

## 🔐 Security Benefits

### 1. **Keys Not in Database**
- ✅ API keys stored only in .env
- ✅ Database only has placeholders
- ✅ Even if database is compromised, keys are safe

### 2. **Keys Not in Frontend Code**
- ✅ Keys replaced on backend before sending
- ✅ No keys visible in frontend bundle
- ✅ Secure transmission

### 3. **Version Control Safe**
- ✅ .env file is in .gitignore
- ✅ Can share database without exposing keys
- ✅ Different keys per environment (dev/staging/prod)

### 4. **Easy Key Rotation**
- ✅ Change key in .env file only
- ✅ No database changes needed
- ✅ Restart server to apply

---

## 📝 Environment Variables Setup

### Add to your `.env` file:

```bash
# ==========================================
# Meta Scripts - Third-Party Integration Keys
# ==========================================

# Google Analytics
GOOGLE_ANALYTICS_ID=G-RS2H45YKSQ

# Google Tag Manager
GOOGLE_TAG_MANAGER_ID=GTM-PNRVGZSD

# Facebook Pixel
FACEBOOK_PIXEL_ID=

# Hotjar
HOTJAR_ID=

# Intercom
INTERCOM_APP_ID=

# Crisp Chat
CRISP_WEBSITE_ID=

# LinkedIn Insight Tag
LINKEDIN_PARTNER_ID=

# Add more as needed...
```

---

## 🎯 Supported Placeholders

Common placeholders you can use:

| Placeholder | Environment Variable | Example Value |
|-------------|---------------------|---------------|
| `{{GOOGLE_ANALYTICS_ID}}` | GOOGLE_ANALYTICS_ID | G-XXXXXXXXXX |
| `{{GOOGLE_TAG_MANAGER_ID}}` | GOOGLE_TAG_MANAGER_ID | GTM-XXXXXXX |
| `{{FACEBOOK_PIXEL_ID}}` | FACEBOOK_PIXEL_ID | 123456789012345 |
| `{{HOTJAR_ID}}` | HOTJAR_ID | 1234567 |
| `{{INTERCOM_APP_ID}}` | INTERCOM_APP_ID | abcd1234 |
| `{{CRISP_WEBSITE_ID}}` | CRISP_WEBSITE_ID | xxxx-xxxx-xxxx |
| `{{LINKEDIN_PARTNER_ID}}` | LINKEDIN_PARTNER_ID | 12345 |

### Add Custom Placeholders:
Just add any `{{CUSTOM_KEY}}` to your script and set `CUSTOM_KEY=value` in .env

---

## 📋 Example Scripts

### Google Analytics (with placeholder):
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={{GOOGLE_ANALYTICS_ID}}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{GOOGLE_ANALYTICS_ID}}');
</script>
```

### Google Tag Manager Header (with placeholder):
```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','{{GOOGLE_TAG_MANAGER_ID}}');</script>
<!-- End Google Tag Manager -->
```

### Google Tag Manager Body (with placeholder):
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{GOOGLE_TAG_MANAGER_ID}}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

---

## ⚙️ Admin Panel Usage

### Adding a New Script:

1. **Script Name**: "Google Analytics"
2. **Description**: "Google Analytics tracking for website analytics"
3. **Script Type**: "analytics"
4. **Position**: "head"
5. **Script Content**: 
```html
<script async src="https://www.googletagmanager.com/gtag/js?id={{GOOGLE_ANALYTICS_ID}}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{GOOGLE_ANALYTICS_ID}}');
</script>
```
6. **Placeholders** (optional, for documentation):
   - Key: `GOOGLE_ANALYTICS_ID`
   - Description: "Google Analytics Measurement ID"
   - Example: "G-XXXXXXXXXX"

7. **Order**: 10 (lower numbers execute first)
8. **Load Strategy**: "async"
9. **Status**: "active"

---

## 🚨 Security Best Practices

### DO ✅
- Use placeholders for all API keys
- Store actual keys in .env file
- Add .env to .gitignore
- Use different keys for dev/staging/production
- Document all placeholders
- Validate script content before saving
- Only allow trusted admins to manage scripts

### DON'T ❌
- Never store actual API keys in database
- Never commit .env file to git
- Never expose keys in frontend code
- Never allow user-generated scripts without validation
- Never share .env file publicly

---

## 🔧 Troubleshooting

### Issue: Placeholder not replaced
**Cause**: Environment variable not set  
**Solution**: Add the variable to .env file

### Issue: Script not loading
**Cause**: Placeholder still visible in frontend  
**Solution**: Check env variable name matches exactly (case-sensitive)

### Issue: Keys exposed
**Cause**: Keys hardcoded in script  
**Solution**: Replace with `{{PLACEHOLDER}}` and add to .env

---

## 📊 Placeholder Validation

The system will:
- ✅ Detect placeholders in format `{{KEY_NAME}}`
- ✅ Warn if env variable is missing
- ✅ Keep placeholder if env var not found (for safety)
- ✅ Log warnings in server console

---

**Version**: 1.0.0  
**Status**: ✅ Secure & Production Ready

