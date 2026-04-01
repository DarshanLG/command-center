# Command Center — Personal Dashboard & Habit Tracker

A full-stack Next.js personal dashboard with Google OAuth, MongoDB persistence, and PWA support. Built for tracking daily habits, schedules, and long-term goals.

**Tech Stack:** Next.js 14 · React 18 · NextAuth.js · MongoDB Atlas · Vercel

---

## Features

- **Google OAuth** — Sign in with your Google account. Each user gets their own isolated data.
- **7 Day Types** — Interchangeable schedule templates (Power Day, Recovery, Pre-Overnight, etc.)
- **Daily Non-Negotiables** — 6-item checklist tracked per day with streak counting
- **Week Planner** — Assign day types to each day of the week
- **Phase Tracker** — 5-phase preparation roadmap with progress bars
- **Stats Dashboard** — Streak, DSA days, gym days, total days tracked
- **Pacific Time** — All dates computed in America/Los_Angeles timezone
- **Mobile PWA** — Installable on iOS/Android as a home screen app
- **Responsive** — Works on phone and desktop

---

## Deployment Guide (30 minutes)

### Step 1: MongoDB Atlas (Free Tier)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → **Try Free**
2. Create account → Create a **FREE** cluster (M0 Sandbox)
3. Choose **AWS → us-west-2** (closest to Long Beach)
4. **Database Access** → Add a database user with username + password
5. **Network Access** → Add IP `0.0.0.0/0` (allows connections from anywhere — needed for Vercel)
6. **Database** → Click **Connect** → **Drivers** → Copy the connection string
7. Replace `<password>` in the string with your actual password

Your URI will look like:
```
mongodb+srv://darshan:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/command-center?retryWrites=true&w=majority
```

### Step 2: Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing one)
3. **APIs & Services** → **OAuth consent screen** → External → Fill required fields
4. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. **Authorized redirect URIs** — Add BOTH:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://YOUR-APP.vercel.app/api/auth/callback/google` (add after Vercel deploy)
7. Copy the **Client ID** and **Client Secret**

### Step 3: Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit: Command Center v1"
git remote add origin https://github.com/DarshanLG/command-center.git
git push -u origin main
```

### Step 4: Deploy to Vercel (Free Tier)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Import** your `command-center` repo
3. Framework: **Next.js** (auto-detected)
4. **Environment Variables** — Add these 4:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://darshan:PASSWORD@cluster0.xxxxx.mongodb.net/command-center?retryWrites=true&w=majority` |
| `GOOGLE_CLIENT_ID` | `your-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `your-secret` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste result |

5. Click **Deploy**
6. After deploy, copy your Vercel URL (e.g., `https://command-center-darshan.vercel.app`)
7. Go back to Google Cloud Console → Add the Vercel callback URL to OAuth Authorized redirect URIs:
   `https://YOUR-APP.vercel.app/api/auth/callback/google`

### Step 5: Install as Mobile App (PWA)

**iPhone:** Open your Vercel URL in Safari → Share button → "Add to Home Screen"
**Android:** Open in Chrome → Three dots → "Add to Home screen" or "Install app"

---

## Local Development

```bash
# Clone
git clone https://github.com/DarshanLG/command-center.git
cd command-center

# Install
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your MongoDB URI, Google OAuth keys, and NextAuth secret

# Run
npm run dev
# Open http://localhost:3000
```

---

## Project Structure

```
command-center/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icon-192.png           # PWA icon
│   └── icon-512.png           # PWA icon
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.js   # Google OAuth
│   │   │   └── data/route.js                 # GET/POST user data
│   │   ├── globals.css
│   │   ├── layout.js
│   │   ├── page.js            # Main dashboard (client component)
│   │   └── Providers.js       # NextAuth SessionProvider
│   ├── lib/
│   │   └── mongodb.js         # Database connection (cached)
│   └── models/
│       ├── User.js            # User schema (email, weekPlan, settings)
│       └── DailyLog.js        # Daily log schema (date, dayType, checks)
├── .env.local.example
├── .gitignore
├── package.json
└── README.md
```

---

## License

Personal project — Darshan Laxman Goneppanavar
