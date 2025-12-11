# 🚀 Git Push Instructions - Security Fix Applied

**Issue:** GitHub push protection blocked push due to sensitive credentials in `config/google-service-account.json`

**Status:** ✅ **FIXED** - Sensitive file removed from git tracking

---

## ✅ What Was Fixed

1. ✅ Removed `config/google-service-account.json` from git tracking
2. ✅ Added to `.gitignore` to prevent future commits
3. ✅ Created `config/google-service-account.json.example` template
4. ✅ Added `SECURITY_SETUP.md` documentation
5. ✅ Added `PRODUCTION_READY_CHECKLIST.md`
6. ✅ Amended commit to remove sensitive data

---

## 🚀 Push to GitHub

### Option 1: Force Push (Recommended if you're the only one working on main)

```bash
git push --force-with-lease origin main
```

**Why `--force-with-lease`?**
- Safer than `--force`
- Prevents overwriting others' work
- Only pushes if remote hasn't changed

### Option 2: If Force Push Fails (History Still Contains Secret)

If GitHub still blocks because the secret exists in commit history, you need to rewrite history:

```bash
# Remove file from all commits (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch config/google-service-account.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push --force-with-lease origin main
```

**⚠️ Warning:** This rewrites git history. Only do this if:
- You're the only one working on this branch
- You've backed up your repository
- You understand the implications

### Option 3: Use GitHub's Secret Scanning Unblock (Temporary)

If you need to push immediately and can't rewrite history:

1. Visit the URL from the error:
   ```
   https://github.com/bsouk/bso_apis/security/secret-scanning/unblock-secret/36iIBsE4UmGvA9X2todcdb0Afkm
   ```

2. Click "Allow this secret" (temporary bypass)

3. Push normally:
   ```bash
   git push origin main
   ```

**⚠️ Note:** This doesn't remove the secret from history, just allows the push. You should still:
- Rotate the credentials in Google Cloud Console
- Remove from history later

---

## 🔐 After Pushing - Security Steps

### 1. Rotate Google Service Account Credentials

**IMPORTANT:** Since the credentials were in git history, you should rotate them:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Find `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
4. Delete the old key
5. Create a new key
6. Download and update `config/google-service-account.json` locally

### 2. Verify Local File Still Exists

The file is still on your local machine (just removed from git):

```bash
ls -la config/google-service-account.json
```

If it exists, you're good. If not, you'll need to:
- Download new credentials from Google Cloud Console
- Place in `config/google-service-account.json`

### 3. Update .env (if needed)

Ensure your `.env` points to the correct file:

```bash
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
```

---

## ✅ Verification

After pushing, verify:

1. **Check GitHub repository:**
   - `config/google-service-account.json` should NOT be visible
   - `config/google-service-account.json.example` should be visible
   - `.gitignore` should include the file

2. **Test locally:**
   ```bash
   # Verify file exists locally
   ls -la config/google-service-account.json
   
   # Test IAP verification still works
   node verify_service_account.js
   ```

---

## 📋 Summary

| Item | Status |
|------|--------|
| File removed from git | ✅ |
| Added to .gitignore | ✅ |
| Template created | ✅ |
| Documentation added | ✅ |
| Commit amended | ✅ |
| Ready to push | ✅ |

---

## 🆘 Troubleshooting

### Error: "remote rejected - push declined"

**Solution:** Use `--force-with-lease` or follow Option 2/3 above

### Error: "file not found" after push

**Solution:** The file is still on your local machine. If missing, download new credentials.

### Error: "IAP verification fails"

**Solution:** 
1. Verify `config/google-service-account.json` exists locally
2. Check `.env` has correct path
3. Rotate credentials if they were exposed

---

**Last Updated:** January 2025
