# 🔧 Fix Git Permission Error on Production Server

**Error**: `Permission denied (publickey)` when running `git pull`  
**Server**: ubuntu@ip-10-0-6-167  
**Directory**: `/var/www/mongo/bso_apis`

---

## ⚡ SOLUTION 1: Switch to HTTPS (FASTEST - Recommended for Production)

**Time**: 2 minutes  
**Complexity**: Easy  
**Security**: Good (uses GitHub personal access token)

### Steps:

```bash
# 1. SSH into your production server
ssh ubuntu@your-server-ip

# 2. Navigate to project
cd /var/www/mongo/bso_apis

# 3. Switch from SSH to HTTPS
git remote set-url origin https://github.com/bsouk/bso_apis.git

# 4. Verify the change
git remote -v

# Should show:
# origin  https://github.com/bsouk/bso_apis.git (fetch)
# origin  https://github.com/bsouk/bso_apis.git (push)

# 5. Try pulling again
git pull
```

### First Pull Will Ask for Credentials:

```
Username for 'https://github.com': your-github-username
Password for 'https://your-github-username@github.com': 
```

**⚠️ IMPORTANT**: Don't enter your GitHub password! Use a **Personal Access Token** instead.

---

## 🔑 Create GitHub Personal Access Token (PAT)

### Step-by-Step:

1. **Go to GitHub**: https://github.com/settings/tokens
2. **Click**: "Generate new token" → "Generate new token (classic)"
3. **Name**: "Production Server - BSO API"
4. **Expiration**: Choose (recommend: 90 days or No expiration for production)
5. **Select scopes**:
   - ✅ `repo` (Full control of private repositories)
6. **Click**: "Generate token"
7. **Copy the token** - You'll only see it once!

Example token: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 💾 Store Credentials (So You Don't Need to Enter Every Time)

### Option A: Git Credential Helper (Recommended)

```bash
# On production server
cd /var/www/mongo/bso_apis

# Enable credential storage
git config --global credential.helper store

# Now do a git pull
git pull

# Enter your GitHub username
# Enter your Personal Access Token (not password!)

# Credentials are now saved in ~/.git-credentials
# Future pulls will work automatically!
```

### Option B: Use .netrc File

```bash
# On production server
nano ~/.netrc

# Add these lines:
machine github.com
login your-github-username
password ghp_your_personal_access_token_here

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Secure the file
chmod 600 ~/.netrc

# Test
cd /var/www/mongo/bso_apis
git pull
```

---

## 🔐 SOLUTION 2: Setup SSH Keys (More Secure)

**Time**: 5 minutes  
**Complexity**: Medium  
**Security**: Excellent

### Steps:

```bash
# 1. SSH into production server
ssh ubuntu@your-server-ip

# 2. Generate SSH key
ssh-keygen -t ed25519 -C "production-bso-api@yourcompany.com"

# Press Enter for all prompts (use default location)
# Enter passphrase (optional, but recommended for production)

# 3. View the public key
cat ~/.ssh/id_ed25519.pub

# Copy the entire output (starts with ssh-ed25519)
```

### Add SSH Key to GitHub:

1. **Copy the public key** from the terminal
2. **Go to GitHub**: https://github.com/settings/keys
3. **Click**: "New SSH key"
4. **Title**: "Production Server - BSO API"
5. **Key type**: Authentication Key
6. **Paste** the public key
7. **Click**: "Add SSH key"

### Test SSH Connection:

```bash
# On production server
ssh -T git@github.com

# Should see:
# Hi bsouk! You've successfully authenticated, but GitHub does not provide shell access.
```

### Update Git Remote (if needed):

```bash
cd /var/www/mongo/bso_apis

# If currently using HTTPS, switch to SSH
git remote set-url origin git@github.com:bsouk/bso_apis.git

# Verify
git remote -v

# Test pull
git pull
```

---

## 🚀 SOLUTION 3: Deploy Keys (Best for Production)

**Time**: 5 minutes  
**Complexity**: Medium  
**Security**: Excellent (read-only access)

Deploy keys are SSH keys tied to a specific repository, not a user account.

### Steps:

```bash
# 1. SSH into production server
ssh ubuntu@your-server-ip

# 2. Generate a deploy key
ssh-keygen -t ed25519 -C "deploy-key-bso-api" -f ~/.ssh/bso_api_deploy_key

# Press Enter (no passphrase for automated deployments)

# 3. View the public key
cat ~/.ssh/bso_api_deploy_key.pub

# Copy the entire output
```

### Add Deploy Key to Repository:

1. **Go to**: https://github.com/bsouk/bso_apis/settings/keys
2. **Click**: "Add deploy key"
3. **Title**: "Production Server Deploy Key"
4. **Key**: Paste the public key
5. **Allow write access**: ❌ Leave unchecked (read-only is safer)
6. **Click**: "Add key"

### Configure Git to Use Deploy Key:

```bash
# On production server
nano ~/.ssh/config

# Add these lines:
Host github.com-bso
    HostName github.com
    User git
    IdentityFile ~/.ssh/bso_api_deploy_key
    IdentitiesOnly yes

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Update git remote to use this config
cd /var/www/mongo/bso_apis
git remote set-url origin git@github.com-bso:bsouk/bso_apis.git

# Test
git pull
```

---

## ✅ Which Solution Should You Use?

| Solution | Best For | Security | Ease |
|----------|----------|----------|------|
| **HTTPS + PAT** | Quick setup, small teams | Good | ⭐⭐⭐⭐⭐ |
| **SSH Keys** | Personal access, multiple repos | Excellent | ⭐⭐⭐⭐ |
| **Deploy Keys** | Production servers, automated deploys | Excellent | ⭐⭐⭐ |

### My Recommendation: 🎯

**For your production server**: Use **Solution 1 (HTTPS + PAT)** because:
- ✅ Quickest to setup
- ✅ Easy to manage
- ✅ Can revoke access anytime
- ✅ Works through firewalls
- ✅ No SSH key management needed

---

## 🔄 Complete Fix Script (Copy-Paste This)

```bash
# Run these commands on your production server:

cd /var/www/mongo/bso_apis

# Switch to HTTPS
git remote set-url origin https://github.com/bsouk/bso_apis.git

# Store credentials
git config --global credential.helper store

# Pull (will ask for credentials once)
git pull

# When prompted:
# Username: your-github-username
# Password: [paste your GitHub Personal Access Token]

# Done! Future pulls will work automatically
```

---

## 🧪 Test Your Fix

```bash
# 1. Navigate to project
cd /var/www/mongo/bso_apis

# 2. Check current branch
git branch

# 3. Check git status
git status

# 4. Try pulling
git pull

# Should succeed without errors!

# 5. Check latest commit
git log -1

# 6. Test deployment process
git pull
npm install --production
pm2 restart bso-api
pm2 logs bso-api --lines 20
```

---

## 🚨 Troubleshooting

### Error: "Authentication failed"
```bash
# Check your credentials
cat ~/.git-credentials

# Or if using .netrc
cat ~/.netrc

# Make sure the token is correct and not expired
```

### Error: "Repository not found"
```bash
# Check remote URL
git remote -v

# Should be one of:
# HTTPS: https://github.com/bsouk/bso_apis.git
# SSH: git@github.com:bsouk/bso_apis.git

# Fix if wrong
git remote set-url origin https://github.com/bsouk/bso_apis.git
```

### Error: "Permission denied (publickey)" (still)
```bash
# If using SSH, test connection
ssh -T git@github.com

# If fails, use HTTPS instead
git remote set-url origin https://github.com/bsouk/bso_apis.git
```

---

## 🔐 Security Best Practices

### For HTTPS with PAT:

1. ✅ **Use tokens** with minimal permissions (only `repo`)
2. ✅ **Set expiration** (90 days recommended)
3. ✅ **Rotate tokens** regularly
4. ✅ **Don't commit** tokens to code
5. ✅ **Use environment** specific tokens

### For SSH Keys:

1. ✅ **Use passphrase** on production keys
2. ✅ **Separate keys** for each server
3. ✅ **Remove old keys** from GitHub when servers are decommissioned
4. ✅ **Use ed25519** algorithm (more secure than RSA)

### For Deploy Keys:

1. ✅ **Read-only** access when possible
2. ✅ **One key per repository**
3. ✅ **Remove keys** when no longer needed
4. ✅ **Use descriptive names**

---

## 📝 Update Deployment Documentation

After fixing, update your deployment process:

```bash
# Your new deployment commands:
ssh ubuntu@your-server-ip
cd /var/www/mongo/bso_apis
git pull  # Now works!
npm install --production
pm2 restart bso-api
pm2 logs bso-api --lines 50
```

---

## ✅ Final Checklist

- [ ] Choose authentication method (HTTPS recommended)
- [ ] Create GitHub Personal Access Token (if using HTTPS)
- [ ] Configure git credential storage
- [ ] Test `git pull` - should work without errors
- [ ] Update deployment documentation
- [ ] Test full deployment process
- [ ] Document credentials securely

---

## 🎯 Quick Reference

### Most Common Commands After Fix:

```bash
# Update code
cd /var/www/mongo/bso_apis
git pull

# Full deployment
cd /var/www/mongo/bso_apis
git pull
npm install --production
pm2 restart bso-api
pm2 logs bso-api

# Check git configuration
git remote -v
git config --list | grep credential
```

---

**That's it!** Your production server should now be able to pull code from GitHub! 🎉

**Need Help?** Try Solution 1 (HTTPS) first - it's the easiest!

