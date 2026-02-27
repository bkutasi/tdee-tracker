# 🔐 Auth & Sync Setup Guide

Add user authentication and cross-device sync to your TDEE Tracker using Supabase.

---

## 📋 Overview

**What you get:**
- ✅ Magic link authentication (no passwords)
- ✅ Cross-device data sync
- ✅ Offline-first architecture
- ✅ Automatic backup
- ✅ Free tier: 50K users/month, 500MB database

**Time required:** 15-20 minutes

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Choose **Free tier** (no credit card needed)
4. Create new organization (if needed)
5. Name your project: `tdee-tracker`
6. Set a strong database password (save it!)
7. Choose region (closest to you)
8. Wait ~2 minutes for setup

---

## Step 2: Get Your Credentials

1. In Supabase dashboard, go to **Settings** (⚙️) → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

⚠️ **Important**: The anon key is SAFE for client-side use - it's restricted by Row Level Security policies, not secrecy.

---

## Step 3: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy/paste entire contents of `supabase-schema.sql`
4. Click **"Run"** (or Ctrl+Enter)

This creates:
- `profiles` table (user settings)
- `weight_entries` table (your data)
- Row Level Security policies (per-user access)
- Automatic profile creation on signup
- Indexes for performance

✅ **Verify setup:**
```sql
SELECT * FROM public.profiles;
SELECT * FROM public.weight_entries;
```

---

## Step 4: Local Development Setup

### 4.1 Create `.env` file

```bash
cd /media/nvme/projects/tdee-tracker
cp .env.example .env
```

### 4.2 Edit `.env`

Open `.env` and paste your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 Generate config

```bash
node scripts/generate-config.js
```

This creates `js/config.js` (gitignored) with your credentials.

✅ **Verify:** Open `js/config.js` - should have your URL and key.

---

## Step 5: Test Locally

1. Open `index.html` in your browser
2. Click the **Account** button (👤) in header
3. Enter your email
4. Click **"Send Magic Link"**
5. Check your email for the magic link
6. Click the link → you're logged in!

✅ **Test sync:**
1. Add a weight entry
2. Check browser console: should see sync logs
3. In Supabase: **Table Editor** → `weight_entries` → see your data

---

## Step 6: Add GitHub Secrets (for auto-deploy)

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Click **"Add secret"** for each

✅ **Verify:** Next push to `master` will auto-deploy with auth enabled.

---

## Step 7: Test Production Deploy

1. Commit and push your changes:

```bash
git add .
git commit -m "Add Supabase auth & sync"
git push origin master
```

2. GitHub Actions will:
   - Run tests
   - Generate config from secrets
   - Deploy to Cloudflare Pages

3. Visit https://tdee.kutasi.dev
4. Log in with magic link
5. Your data should sync!

---

## 🔧 Troubleshooting

### "Supabase configuration not found"

**Fix:** Run `node scripts/generate-config.js` again

### Magic link email not arriving

**Check:**
1. Spam folder
2. Supabase **Authentication** → **Email Templates** (ensure enabled)
3. Email address spelling

### "Not authenticated" errors

**Fix:**
1. Check browser console for errors
2. Verify RLS policies are enabled in Supabase
3. Try signing out and back in

### Data not syncing

**Check:**
1. Browser console: look for `[Sync]` logs
2. Network tab: check Supabase requests
3. Supabase **Logs** → see server-side errors

### GitHub deploy fails

**Check:**
1. GitHub Actions logs for errors
2. Verify secrets are set correctly
3. Ensure `js/config.js` is in `.gitignore`

---

## 📊 Database Schema

### Tables

**`profiles`**
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `settings` (JSONB) - unit, theme, preferences
- `created_at`, `updated_at`

**`weight_entries`**
- `id` (UUID)
- `user_id` (UUID, references profiles)
- `date` (DATE)
- `weight` (DECIMAL)
- `calories` (INTEGER, optional)
- `notes` (TEXT, optional)
- `created_at`, `updated_at`

### Security

Row Level Security (RLS) ensures:
- Users can ONLY see their own data
- Users can ONLY edit their own entries
- No cross-user data access

---

## 🚀 Next Steps

### Optional Enhancements

1. **OAuth providers** (Google, GitHub, Apple)
   - Enable in Supabase **Authentication** → **Providers**

2. **Data migration** from LocalStorage
   - On first login, offer to upload existing data

3. **Settings sync**
   - Sync theme, unit preferences across devices

4. **Real-time updates**
   - Use Supabase Realtime for live sync

5. **Backup/restore**
   - Export data as JSON, import to new account

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Magic Links](https://supabase.com/docs/guides/auth/auth-magic-link)

---

## 🆘 Support

**Issues?**
1. Check this guide's troubleshooting section
2. Review Supabase dashboard logs
3. Check browser console for errors
4. Verify database schema is correct

**Security notes:**
- ✅ Anon key is safe for client-side
- ❌ NEVER commit `.env` to git
- ❌ NEVER share your service role key
- ✅ RLS policies protect your data

---

**Happy tracking! 📊✨**
