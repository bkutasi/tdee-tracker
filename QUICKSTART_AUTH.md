# 🚀 Quick Start: Auth Setup (5 Minutes)

## ✅ Prerequisites
- Supabase account (free at supabase.com)
- 15 minutes of time

---

## Step-by-Step

### 1. Create Supabase Project (3 min)
```
1. Go to https://supabase.com
2. Click "Start your project"
3. Choose Free tier
4. Name: "tdee-tracker"
5. Set database password (save it!)
6. Choose region closest to you
7. Wait 2 minutes for setup
```

### 2. Get Credentials (1 min)
```
1. Settings (⚙️) → API
2. Copy:
   - Project URL: https://xxxxx.supabase.co
   - anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Set Up Database (2 min)
```
1. SQL Editor → New query
2. Paste entire contents of: supabase-schema.sql
3. Click "Run"
4. ✅ Done!
```

### 4. Local Setup (2 min)
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your favorite editor

# Generate config
node scripts/generate-config.js

# Test it!
# Open index.html in browser
```

### 5. Add GitHub Secrets (2 min)
```
GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- SUPABASE_URL = your project URL
- SUPABASE_ANON_KEY = your anon key
```

---

## ✅ Test It

1. **Open app** → Click Account button (👤)
2. **Enter email** → Click "Send Magic Link"
3. **Check email** → Click the magic link
4. **Add weight entry** → Watch it sync to Supabase!

---

## 📁 Files Created

```
js/
├── config.js          # Generated (gitignored)
├── auth.js            # Auth module
└── sync.js            # Sync module

js/ui/
└── auth-modal.js      # Login UI

scripts/
└── generate-config.js # Config generator

.env                   # Your credentials (gitignored)
supabase-schema.sql    # Database setup
```

---

## 🔧 Commands

```bash
# Generate config from .env
node scripts/generate-config.js

# Check if config exists
cat js/config.js

# View sync logs
# Open browser console → Filter: [Sync]
```

---

## 🆘 Troubleshooting

**No config?** → Run `node scripts/generate-config.js`

**No email?** → Check spam folder, verify email in Supabase

**Not syncing?** → Check browser console for errors

**Deploy fails?** → Verify GitHub secrets are set

---

## 📚 Full Guide

See `SETUP_AUTH.md` for detailed instructions.

---

**That's it! You're done! 🎉**
