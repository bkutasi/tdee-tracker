<!-- Context: development/guides/supabase-quickstart | Priority: critical | Version: 1.0 | Updated: 2026-03-02 -->

# Guide: Supabase Quick Start (5 min)

**Purpose**: Get authentication and sync working in 5 minutes with step-by-step instructions.

**Last Updated**: 2026-03-02

---

## Prerequisites

- GitHub account (for deployment)
- Email address (for magic link)
- 5 minutes

---

## Step 1: Create Supabase Project (1 min)

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Choose **Free tier** (no credit card needed)
4. Name: `tdee-tracker`
5. Set strong database password (save it!)
6. Wait ~2 minutes for setup

---

## Step 2: Get Credentials (30 sec)

1. Settings (⚙️) → **API**
2. Copy:
   - **Project URL**: `https://xyzcompany.supabase.co`
   - **anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Note**: Anon key is safe for client-side (RLS protects data)

---

## Step 3: Set Up Database (1 min)

1. SQL Editor → **"New query"**
2. Paste entire `supabase-schema.sql`
3. Click **"Run"**

✅ **Verify**:
```sql
SELECT * FROM public.profiles;
SELECT * FROM public.weight_entries;
```

---

## Step 4: Local Setup (1 min)

```bash
# Create .env file
cp .env.example .env

# Edit .env with your credentials
# SUPABASE_URL=your URL
# SUPABASE_ANON_KEY=your key

# Generate config
node scripts/generate-config.js
```

✅ **Verify**: Open `js/config.js` — should have your credentials

---

## Step 5: Test Locally (1 min)

1. Open `index.html` in browser
2. Click **Account** button (👤)
3. Enter email → **"Send Magic Link"**
4. Check email → Click link → Logged in!
5. Add weight entry → Check console for `[Sync]` logs

✅ **Verify**: Supabase Table Editor → `weight_entries` → see your data

---

## Step 6: Add GitHub Secrets (30 sec)

1. GitHub repo → Settings → **Secrets and variables** → **Actions**
2. Add secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_ANON_KEY` | Your anon key |

---

## Step 7: Deploy (30 sec)

```bash
git add .
git commit -m "Add Supabase auth & sync"
git push origin master
```

✅ **Verify**: GitHub Actions → Deploy succeeds → Visit https://tdee.kutasi.dev

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Config not found | Run `node scripts/generate-config.js` |
| No email received | Check spam, verify email in Supabase dashboard |
| Not syncing | Check console for [Sync] logs, verify RLS policies |
| Deploy failed | Verify GitHub secrets, check Actions logs |

---

## Next Steps

- [ ] Enable OAuth (Google, GitHub) in Supabase dashboard
- [ ] Migrate existing LocalStorage data on first login
- [ ] Add settings sync across devices
- [ ] Enable real-time sync with Supabase Realtime

**References**:
- `SETUP_AUTH.md` — Detailed setup guide (261 lines)
- `supabase-schema.sql` — Database schema
- `scripts/generate-config.js` — Config generator

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 108 lines)
