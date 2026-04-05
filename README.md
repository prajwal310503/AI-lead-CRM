# StartWebOS — Agency Command Center v3.0

A full-stack CRM + Operations platform for digital agencies. Built with React 18 + Vite (frontend), Node.js + Express (backend), and Supabase (database + auth).

---

## 🔐 Login

Use the credentials you created in Supabase → Authentication → Users.

Default login URL: http://localhost:5173/login

---

## 🧰 Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Glassfrost UI
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State:** Zustand + TanStack Query v5
- **Drag & Drop:** @dnd-kit/core + sortable
- **Icons:** lucide-react

---

## 📋 Prerequisites

Make sure you have these installed:

- **Node.js** v18 or higher → https://nodejs.org
- **npm** v9 or higher (comes with Node.js)
- A **Supabase** account → https://supabase.com (free tier works)

---

## ⚙️ First-Time Setup

### Step 1 — Clone / Download the project

Place the project folder anywhere on your machine. This guide assumes it is at:
```
C:\Users\YourName\Downloads\StartWebOS
```

---

### Step 2 — Set up Supabase

1. Go to **https://app.supabase.com** and sign in
2. Create a new project (or use existing `startos_v2`)
3. Wait for the project to finish setting up (~2 min)

#### 2a. Run the database schema

1. In Supabase dashboard → left sidebar → **SQL Editor**
2. Open the file `blueprint.md` in the project root
3. Copy all SQL from the **"SQL Migration"** section
4. Paste into SQL Editor and click **Run**

#### 2b. Create Storage Buckets

In Supabase → **Storage** → create these 7 buckets (all public):

| Bucket Name |
|-------------|
| `proposals` |
| `invoices`  |
| `vault`     |
| `logos`     |
| `avatars`   |
| `reports`   |
| `payments`  |

#### 2c. Create your login user

1. Supabase → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter your email and a secure password
4. Click **Create user**

---

### Step 3 — Configure environment files

#### `server/.env`
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=StartWeb
WA_TOKEN=
WA_PHONE_ID=
SERPAPI_KEY=
APIFY_TOKEN=
GOOGLE_MAPS_KEY=
```

#### `client/.env`
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

---

### Step 4 — Install dependencies

Open a terminal in the project root folder and run:

```bash
npm install
```

This installs dependencies for both `client/` and `server/` at once (npm workspaces).

---

### Step 5 — Seed sample data (optional)

To create the admin profile and 15 sample leads:

```bash
node server/seed.js
```

---

### Step 6 — Start the app

```bash
npm run dev
```

This starts both frontend and backend together:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## 🚀 Running the App (Daily Use)

Every time you want to start the app:

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 🔑 Login

Open **http://localhost:5173/login** and sign in with the user you created in Supabase.

---

## 📦 Build for Production

```bash
npm run build
```

Output goes to `client/dist/`. Deploy this folder to Vercel, Netlify, or any static host. Deploy the `server/` folder to Railway, Render, or any Node.js host.

### After deploying — update these:

1. `server/.env` → change `FRONTEND_URL` to your live domain
2. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL:** your live domain
   - **Redirect URLs:** `https://yourdomain.com/**`

---

## ⚠️ Supabase Free Tier — Prevent Auto-Pause

Supabase free projects **pause after 1 week of inactivity**.

**Fix:** Set up a free ping on **https://cron-job.org**

1. Sign up at cron-job.org
2. Create a new cronjob:
   - **Title:** `Supabase Keep Alive`
   - **URL:** your Supabase project URL (found in Project Settings → API)
   - **Schedule:** Every day
3. Save — done. Project will never pause again.

**If it pauses:** Go to https://app.supabase.com → open project → click **Restore project**

---

## 📁 Project Structure

```
StartWebOS/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/           # All page components
│   │   ├── components/      # Shared UI components
│   │   ├── stores/          # Zustand state stores
│   │   ├── lib/             # Supabase client, API, AI router
│   │   └── utils/           # Helpers, formatters
│   └── .env                 # Frontend environment variables
├── server/                  # Node.js + Express backend
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── seed.js              # Database seeder
│   └── .env                 # Backend environment variables
├── package.json             # Root workspace config
└── README.md                # This file
```

---

## 🗺️ Key Routes

| URL                    | Page                        |
|------------------------|-----------------------------|
| `/`                    | Dashboard (Overview)        |
| `/leads`               | Client Hunter (Kanban)      |
| `/leads/crm`           | CRM Pipeline                |
| `/leads/interested`    | Interested Leads            |
| `/leads/whatsapp`      | WhatsApp Center             |
| `/proposals`           | Proposals                   |
| `/agreements`          | Agreements                  |
| `/tasks`               | Task Board                  |
| `/payments`            | Payments & Invoices         |
| `/vault`               | File Vault                  |
| `/team`                | Team Management             |
| `/settings`            | Settings                    |
| `/login`               | Login                       |

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot connect to Supabase` | Project is paused → go to app.supabase.com and restore |
| `npm install` fails | Make sure Node.js v18+ is installed |
| Login fails | Check user exists in Supabase → Authentication → Users |
| Port 5000 in use | Change `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001` in `client/.env` |
| Build size warning | Normal — bundle is large but works fine |
| WhatsApp not sending | Requires Meta Cloud API credentials in `server/.env` |
| AI Analyze not working | Add API key in Settings → AI Configuration |
