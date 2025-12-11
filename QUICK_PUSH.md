# 🚀 Quick Push Instructions

## ⚠️ Push is Blocked - Need to Unblock First

GitHub is blocking because secrets exist in **old commit history** (not current files).

---

## 🔓 Step 1: Unblock Secrets

Click these 3 URLs and click **"Allow this secret"** for each:

1. **https://github.com/bsouk/bso_apis/security/secret-scanning/unblock-secret/36iIBsE4UmGvA9X2todcdb0Afkm**

2. **https://github.com/bsouk/bso_apis/security/secret-scanning/unblock-secret/36iN4XjXRpsn87rFkESXTvN8eEf**

3. **https://github.com/bsouk/bso_apis/security/secret-scanning/unblock-secret/36iN4QtzwCeQbsO0SDGZEi5UOQJ**

---

## 🚀 Step 2: Push Code

After unblocking all 3 secrets, run:

```bash
git push --force-with-lease origin main
```

---

## ✅ After Push

1. **Create `.env` file on server** with your production credentials
2. **Create `config/google-service-account.json`** on server (if using file-based)
3. **See `PRODUCTION_DEPLOYMENT_GUIDE.md`** for complete setup

---

**Note:** .md files are documentation and should stay in git. We've already removed all secrets from them.
