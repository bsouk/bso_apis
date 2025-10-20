# 🚀 BSO API - Quick Deployment Reference

**Server**: `bsoservices@your-server-ip`  
**Directory**: `/home/bsoservices/ci-cd`  
**Port**: 5000  
**PM2 App Name**: `bso-api`

---

## ⚡ Most Common Commands

### Connect to Server
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
```

### Deploy New Code
```bash
git pull origin main
npm install --production
pm2 restart bso-api
pm2 logs bso-api --lines 50
```

### Check Status
```bash
pm2 status
pm2 logs bso-api
pm2 monit
```

### Restart Everything
```bash
pm2 restart bso-api
pm2 logs bso-api --err
```

### Emergency Stop
```bash
pm2 stop bso-api
# Fix the issue
pm2 start bso-api
```

---

## 🗄️ Database - No Migrations Needed!

**Mongoose automatically:**
- Creates database on first connection
- Creates collections when models are used
- Handles all schema updates

**Just deploy and run!** ✅

---

## 📝 First Time Setup Only

```bash
# 1. Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 2. Install PM2
npm install -g pm2
pm2 startup
pm2 save

# 3. Clone project
cd /home/bsoservices/ci-cd
git clone https://github.com/bsouk/bso_apis.git .

# 4. Install dependencies
npm install --production

# 5. Create .env file
nano .env
# (Paste production env vars, save)

# 6. Upload Firebase key
# scp your-firebase-key.json to src/config/

# 7. Start application
pm2 start server.js --name "bso-api"
pm2 save

# 8. Done! ✅
```

---

## 🔍 Troubleshooting

### App Not Starting?
```bash
pm2 logs bso-api --err --lines 100
```

### Database Connection Failed?
```bash
cat .env | grep MONGODB
# Check if URI is correct
```

### Port Already in Use?
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
pm2 restart bso-api
```

### Need to Clear Everything?
```bash
pm2 delete bso-api
rm -rf node_modules package-lock.json
npm install --production
pm2 start server.js --name "bso-api"
pm2 save
```

---

## ✅ Post-Deployment Checklist

```bash
# 1. Check PM2 status
pm2 status  # Should show "online"

# 2. Check logs
pm2 logs bso-api --lines 50  # Should see "MongoDB connected"

# 3. Test API
curl http://localhost:5000/  # Should return "Welcome to bso"

# 4. Test from browser
# Visit: http://your-domain.com/

# 5. Monitor for 5 minutes
pm2 monit
```

---

## 📊 Useful PM2 Commands

```bash
pm2 list              # List all apps
pm2 status            # Same as list
pm2 logs bso-api      # View logs (live)
pm2 logs bso-api -f   # Follow logs
pm2 logs bso-api --err # Only errors
pm2 flush bso-api     # Clear logs
pm2 restart bso-api   # Restart app
pm2 reload bso-api    # Zero-downtime restart
pm2 stop bso-api      # Stop app
pm2 start bso-api     # Start app
pm2 delete bso-api    # Remove from PM2
pm2 monit             # Monitor CPU/Memory
pm2 save              # Save current config
```

---

## 🆘 Emergency Commands

### Something is broken, quick fix!
```bash
# 1. Stop everything
pm2 stop all

# 2. Check what's wrong
pm2 logs bso-api --err --lines 200

# 3. Restart
pm2 restart all

# 4. If still broken, full restart
pm2 delete all
cd /home/bsoservices/ci-cd
pm2 start server.js --name "bso-api"
pm2 save
```

### Server is slow/hanging
```bash
# Check memory
free -h

# Check CPU
top

# Restart app
pm2 restart bso-api

# If server is out of memory
sudo reboot
# (Wait 2 minutes, then SSH back in)
```

---

## 📱 Test Endpoints

```bash
# Health check
curl http://localhost:5000/

# Admin login
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin-email","password":"your-password"}'

# Test from outside
curl http://your-domain.com/
```

---

## 🔐 Environment Variables Location

```bash
# View .env location
ls -la /home/bsoservices/ci-cd/.env

# Edit .env
nano /home/bsoservices/ci-cd/.env

# After editing .env, restart
pm2 restart bso-api
```

---

## 💾 Backup Commands

```bash
# Backup database (MongoDB)
mongodump --uri="mongodb://localhost:27017/bso_production" \
  --out="/home/bsoservices/backups/$(date +%Y%m%d)"

# Backup uploaded files
tar -czf ~/backups/uploads_$(date +%Y%m%d).tar.gz \
  /home/bsoservices/ci-cd/public
```

---

## 🎯 Common Scenarios

### Scenario 1: Fixed a bug, need to deploy
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
git pull origin main
pm2 restart bso-api
pm2 logs bso-api --lines 50
```

### Scenario 2: Added new npm package
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
git pull origin main
npm install --production
pm2 restart bso-api
pm2 logs bso-api
```

### Scenario 3: Changed .env file
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
nano .env  # Make your changes
pm2 restart bso-api
pm2 logs bso-api
```

### Scenario 4: App crashed and won't start
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
pm2 logs bso-api --err --lines 200  # Find the error
# Fix the issue (update code, fix env, etc.)
pm2 restart bso-api
```

### Scenario 5: Need to rollback
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
git log --oneline  # See recent commits
git reset --hard <previous-commit-hash>
pm2 restart bso-api
```

---

## 📞 Support Contacts

**DevOps Team**: [Contact Info]  
**Database Team**: [Contact Info]  
**Server IP**: [Your Server IP]  
**Server User**: bsoservices  
**SSH Key**: [Location of SSH key]

---

## 📝 Notes

- **No database migrations needed** - Mongoose handles everything automatically
- **Always run `pm2 save`** after making PM2 changes
- **Check logs** after every deployment
- **Monitor for 5 minutes** after deploying to production
- **Take database backup** before major updates

---

**Last Updated**: October 20, 2025  
**Document Version**: 1.0  

**Print this and keep it handy!** 📄

