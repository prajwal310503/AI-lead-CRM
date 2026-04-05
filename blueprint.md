# ⚡ StartWebOS — ULTRA MASTER PROMPT v3.0
### The Single Source of Truth for AI-Assisted Development

---

## 🧠 WHO YOU ARE & WHAT YOU'RE BUILDING

You are an expert full-stack developer building **StartWebOS** — a complete AI-powered Agency Operating System for **StartWeb**, owned by **StartWeb**, based in **Panvel, Navi Mumbai, India**.

StartWebOS automates the entire agency pipeline end-to-end:
> **Lead Discovery → AI Analysis → WhatsApp Outreach → Report → Proposal → Agreement → Project → Invoice → Payment → Vault → Done**

Everything runs on AUTO mode. Every action triggers notifications to all relevant parties via WhatsApp, Email, and In-App alerts.

---

## 🚫 ABSOLUTE RULES — NEVER VIOLATE

1. **NO TypeScript** — Pure JavaScript everywhere, zero `.ts` or `.tsx` files
2. **NO emojis in UI code** — Lucide React icons ONLY (`lucide-react`)
3. **NO Next.js** — React 18 + Vite only
4. **NO MongoDB** — Supabase (PostgreSQL) only
5. **NO Firebase, Prisma, GraphQL** — strictly forbidden
6. **NO emoji in JSX/HTML** — use `<Icon />` components only
7. **Supabase service key = backend (server) ONLY** — NEVER import in frontend
8. **RLS on ALL Supabase tables** — never bypass security
9. **API keys stored in Supabase `app_settings` table** — not in `.env` (except Supabase URL/keys)
10. **Company name = StartWeb** (never "StartWebCloud" in UI)
11. **Software name = StartWebOS** (in title bar, login, sidebar)
12. **Orange `#FF6B35` = primary CTA color** — all primary buttons, active states
13. **Dark mode must be flawless** — test every component in both themes
14. **Touch DnD required** — configure `TouchSensor` for mobile Kanban
15. **node-cron timezone = `Asia/Kolkata`** — all schedulers
16. **Invoice format = `SW-YYYY-NNN`** — sequential counter in `app_settings`
17. **All PDF exports = dark theme** — dark bg + orange headings + blue accents
18. **Score rings = SVG** — never CSS border tricks
19. **Every send logs to DB** — WhatsApp messages stored in `whatsapp_messages` table
20. **Role guard on EVERY route** — client portal fully isolated from main app

---

## 🛠️ TECH STACK — STRICT

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | JS only — zero TypeScript |
| Backend | Node.js + Express | REST API |
| Database | Supabase (PostgreSQL) | RLS on all tables |
| Auth | Supabase Auth | Email/Password |
| Storage | Supabase Storage | Files, PDFs, logos, assets |
| Realtime | Supabase Realtime | Live notifications, task updates |
| Styling | Tailwind CSS v3 | Custom Glassfrost design system |
| UI Lib | shadcn/ui (JS adapted) | Plain JS — no TS version |
| Icons | lucide-react | ONLY icon library — no emojis ever |
| State | Zustand + persist | Global + local state management |
| Data Fetching | TanStack Query v5 | Server state, caching, invalidation |
| Animations | Framer Motion | Page transitions, modals, drawers |
| Charts | Recharts | All analytics and dashboards |
| Drag & Drop | @dnd-kit/core | Kanban board — mouse + touch |
| PDF | jsPDF + autotable | Client-side PDF generation |
| QR Codes | qrcode (npm) | UPI payment QR generation |
| Email | Nodemailer | All transactional email (backend) |
| WhatsApp | Meta Cloud API | All WhatsApp notifications |
| Scheduler | node-cron | Auto workflows, reminders, follow-ups |
| HTTP Client | Axios | All API calls frontend + backend |
| Toasts | react-hot-toast | All user-facing notifications |
| Dates | date-fns | Formatting, comparison, calculation |

---

## 🎨 DESIGN SYSTEM — GLASSFROST UI v3

### Brand Colors
```
Orange Primary:   #FF6B35   → CTAs, active nav, primary buttons
Orange Hover:     #E85D2A   → Hover/pressed states
Blue Primary:     #0EA5E9   → Links, info, secondary actions
Electric Indigo:  #6366F1   → Active nav indicator, premium badges
Emerald:          #10B981   → Success, paid, converted, complete
Amber:            #F59E0B   → Warning, warm leads, overdue
Crimson:          #EF4444   → Danger, lost leads, critical overdue
Purple:           #8B5CF6   → Proposals, premium features
```

### CSS Variables (Complete — index.css)
```css
:root {
  --bg-primary: #F0F4FF; --bg-secondary: #E8EFFE;
  --bg-card: #FFFFFF; --bg-glass: rgba(255,255,255,0.72);
  --bg-glass-strong: rgba(255,255,255,0.90);
  --border: rgba(14,165,233,0.18); --border-strong: rgba(14,165,233,0.35);
  --border-white: rgba(255,255,255,0.60);
  --text-primary: #0A0F1E; --text-secondary: #3D4A6B; --text-muted: #8892AA;
  --orange: #FF6B35; --orange-dark: #E85D2A;
  --orange-light: #FFF0EA; --orange-glow: rgba(255,107,53,0.30);
  --blue: #0EA5E9; --blue-dark: #0284C7;
  --blue-light: #DBEAFE; --blue-glow: rgba(14,165,233,0.30);
  --indigo: #6366F1; --indigo-light: #EEF2FF;
  --purple: #8B5CF6; --purple-light: #F3E8FF;
  --emerald: #10B981; --emerald-light: #D1FAE5;
  --amber: #F59E0B; --amber-light: #FEF3C7;
  --crimson: #EF4444; --crimson-light: #FEE2E2;
  --r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:16px;
  --r-xl:20px; --r-2xl:24px; --r-3xl:32px; --r-full:9999px;
  --shadow-sm: 0 1px 4px rgba(10,15,30,0.08);
  --shadow-md: 0 4px 16px rgba(10,15,30,0.10);
  --shadow-lg: 0 8px 32px rgba(10,15,30,0.12);
  --shadow-glass: 0 8px 32px rgba(14,165,233,0.10), inset 0 1px 0 rgba(255,255,255,0.80);
  --shadow-orange: 0 4px 24px rgba(255,107,53,0.30);
  --shadow-blue: 0 4px 24px rgba(14,165,233,0.30);
  --shadow-card: 0 2px 12px rgba(14,165,233,0.08), 0 1px 4px rgba(0,0,0,0.04);
}
[data-theme="dark"] {
  --bg-primary: #05060F; --bg-secondary: #0B0D1A;
  --bg-card: #111226; --bg-glass: rgba(17,18,38,0.80);
  --bg-glass-strong: rgba(17,18,38,0.95);
  --border: rgba(99,102,241,0.15); --border-strong: rgba(99,102,241,0.30);
  --border-white: rgba(255,255,255,0.06);
  --text-primary: #F0F4FF; --text-secondary: #9BA3C0; --text-muted: #4A5280;
  --shadow-glass: 0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.05);
  --shadow-card: 0 2px 12px rgba(0,0,0,0.30), 0 1px 4px rgba(99,102,241,0.08);
}
```

### Glassfrost Core Classes
```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid var(--border-white);
  box-shadow: var(--shadow-glass);
}
.glass-strong { background: var(--bg-glass-strong); backdrop-filter: blur(32px) saturate(220%); }
.glass-orange  { background: rgba(255,107,53,0.10); border: 1px solid rgba(255,107,53,0.25); }
.glass-blue    { background: rgba(14,165,233,0.10);  border: 1px solid rgba(14,165,233,0.25);  }
.glass-indigo  { background: rgba(99,102,241,0.10);  border: 1px solid rgba(99,102,241,0.25);  }
.glass-emerald { background: rgba(16,185,129,0.10);  border: 1px solid rgba(16,185,129,0.25);  }
.glass-amber   { background: rgba(245,158,11,0.10);  border: 1px solid rgba(245,158,11,0.25);  }
.glass-crimson { background: rgba(239,68,68,0.10);   border: 1px solid rgba(239,68,68,0.25);   }
```

### Typography
```
Primary Font:  Plus Jakarta Sans (weights: 300,400,500,600,700,800)
Monospace Font: JetBrains Mono (weights: 400,500,600)
Import: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap
```

### Body Background (Radial Mesh)
```css
body.light {
  background:
    radial-gradient(ellipse 90% 60% at 5% -10%, rgba(255,107,53,0.14) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 95% 5%, rgba(14,165,233,0.12) 0%, transparent 55%),
    radial-gradient(ellipse 50% 70% at 50% 100%, rgba(99,102,241,0.08) 0%, transparent 55%),
    #F0F4FF;
}
body.dark {
  background:
    radial-gradient(ellipse 90% 60% at 5% -10%, rgba(255,107,53,0.09) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 95% 5%, rgba(14,165,233,0.09) 0%, transparent 55%),
    radial-gradient(ellipse 50% 70% at 50% 100%, rgba(99,102,241,0.07) 0%, transparent 55%),
    #05060F;
}
```

### Component Rules
- **Cards:** `border-radius: var(--r-xl)` + hover: `translateY(-3px)` + colored glow
- **Buttons Primary:** Orange gradient + `box-shadow: var(--shadow-orange)` + lift on hover
- **Buttons Secondary:** Glass background + border + blue hover state
- **Modals on mobile:** Full-screen bottom sheet (Framer Motion y-slide, drag to dismiss)
- **Modals on desktop:** Centered dialog, max-w varies by content
- **All panels/drawers:** Glassfrost, slide-in from right (Framer Motion)
- **Stat cards:** Must POP — colored glass variants, count-up animation, sparkline chart

---

## 🗂️ FOLDER STRUCTURE

```
startwebos/
├── client/                          ← React 18 + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── MobileNav.jsx
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   └── ClientPortalLayout.jsx
│   │   │   └── shared/
│   │   │       ├── GlassCard.jsx
│   │   │       ├── StatCard.jsx
│   │   │       ├── ScoreBadge.jsx
│   │   │       ├── LoadingSkeleton.jsx
│   │   │       ├── EmptyState.jsx
│   │   │       ├── ConfirmDialog.jsx
│   │   │       ├── ThemeToggle.jsx
│   │   │       ├── NotificationDrawer.jsx
│   │   │       ├── CommandPalette.jsx
│   │   │       ├── StatusBadge.jsx
│   │   │       ├── PriorityBadge.jsx
│   │   │       └── PageHeader.jsx
│   │   ├── modules/
│   │   │   ├── leads/
│   │   │   ├── proposals/
│   │   │   ├── tasks/
│   │   │   ├── payments/
│   │   │   ├── vault/
│   │   │   └── team/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AcceptInvitePage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── LeadsPage.jsx
│   │   │   ├── ProposalsPage.jsx
│   │   │   ├── TasksPage.jsx
│   │   │   ├── PaymentsPage.jsx
│   │   │   ├── VaultPage.jsx
│   │   │   ├── TeamPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── roleDashboards/
│   │   │   │   ├── DeveloperDashboard.jsx
│   │   │   │   ├── DesignerDashboard.jsx
│   │   │   │   └── ManagerDashboard.jsx
│   │   │   └── clientPortal/
│   │   │       ├── ClientLogin.jsx
│   │   │       ├── ClientDashboard.jsx
│   │   │       ├── ClientProjects.jsx
│   │   │       ├── ClientInvoices.jsx
│   │   │       └── ClientReports.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   ├── api.js
│   │   │   └── ai/
│   │   │       ├── index.js
│   │   │       ├── claude.js
│   │   │       ├── openai.js
│   │   │       ├── gemini.js
│   │   │       └── openrouter.js
│   │   ├── stores/
│   │   │   ├── useAuthStore.js
│   │   │   ├── useSettingsStore.js
│   │   │   ├── useLeadsStore.js
│   │   │   ├── useNotificationsStore.js
│   │   │   └── useTeamStore.js
│   │   ├── hooks/
│   │   │   ├── useRequireAuth.js
│   │   │   ├── useRoleGuard.js
│   │   │   ├── useTheme.js
│   │   │   ├── useRealtime.js
│   │   │   └── useNotifications.js
│   │   └── utils/
│   │       ├── formatters.js
│   │       ├── scoreHelpers.js
│   │       └── constants.js
│   ├── index.css        ← Glassfrost complete CSS
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/
│   ├── routes/          ← auth, leads, proposals, tasks, payments, invoices,
│   │                       vault, team, settings, notifications, ai, client-portal
│   ├── middleware/       ← authMiddleware, roleMiddleware, errorHandler
│   ├── services/
│   │   ├── emailService.js
│   │   ├── whatsappService.js
│   │   ├── notificationService.js
│   │   ├── pdfService.js
│   │   ├── qrService.js
│   │   └── schedulerService.js
│   ├── lib/
│   │   └── supabaseAdmin.js      ← service role — backend ONLY
│   └── index.js
│
├── .env
└── package.json
```

---

## 🗄️ SUPABASE DATABASE SCHEMA

### Tables (15 total — all with RLS enabled)

**1. `profiles`** — Team members + admin
```sql
id UUID PK (ref auth.users), name TEXT, email TEXT UNIQUE,
role TEXT CHECK('admin','manager','developer','designer','agency','client'),
avatar_url TEXT, phone TEXT, is_active BOOLEAN DEFAULT true,
invited_by UUID, last_login TIMESTAMPTZ,
portal_token UUID UNIQUE DEFAULT uuid_generate_v4()
```

**2. `app_settings`** — Global config per admin user
```sql
user_id UUID UNIQUE, active_provider TEXT DEFAULT 'claude',
active_model TEXT DEFAULT 'claude-sonnet-4-6',
api_keys JSONB, serpapi_key TEXT, apify_token TEXT,
whatsapp_enabled BOOLEAN, whatsapp_token TEXT, whatsapp_phone_id TEXT,
smtp_host/port/user/pass TEXT, company_name/logo/address/phone/email TEXT,
gst_number TEXT, upi_id TEXT, bank_name/account_number/ifsc TEXT,
invoice_prefix TEXT DEFAULT 'SW', invoice_counter INT DEFAULT 0,
default_tax DECIMAL DEFAULT 18.00, timezone TEXT DEFAULT 'Asia/Kolkata'
```

**3. `leads`** — Full lead data + AI scores + pipeline status
```sql
id UUID PK, business_name TEXT NOT NULL, owner_name TEXT,
phone TEXT, email TEXT, website TEXT, industry TEXT, city TEXT,
google_rating DECIMAL, google_reviews_count INT, gmb_status TEXT,
instagram_url/facebook_url/linkedin_url TEXT, social_data JSONB,
health_score INT(0-100), website_score(0-30), gmb_score(0-25),
social_score(0-20), seo_score(0-15), competitor_score(0-10),
pain_points/opportunities/competitors JSONB,
service_pitch TEXT, ai_hook_message TEXT, recommended_services JSONB,
status TEXT CHECK('cold','contacted','warm','hot','proposal_sent',
  'negotiation','converted','lost'),
source TEXT CHECK('serpapi','apify','manual','referral','linkedin'),
is_priority BOOL, is_analysed BOOL, is_interested BOOL,
next_followup_date DATE, followup_count INT, auto_followup BOOL,
auto_followup_days INT DEFAULT 3, last_contacted TIMESTAMPTZ
```

**4. `lead_activities`** — Timeline log per lead
```sql
lead_id UUID FK, user_id UUID FK, type TEXT, title TEXT,
description TEXT, metadata JSONB
```

**5. `whatsapp_messages`** — Every WA message logged
```sql
lead_id UUID, client_id UUID, phone TEXT, message TEXT,
direction TEXT('outbound','inbound'), status TEXT('sent','delivered','read','failed'),
wa_msg_id TEXT, sent_at TIMESTAMPTZ
```

**6. `clients`** — Converted leads become clients
```sql
lead_id UUID FK, name TEXT, business_name TEXT, email/phone/website TEXT,
portal_token UUID UNIQUE, portal_password TEXT,
total_billed/total_paid DECIMAL DEFAULT 0
```

**7. `services`** — Service catalog (seeded with 14 default services)
```sql
name TEXT, description TEXT,
category TEXT CHECK('web','seo','social','ads','design','content',
  'marketing','analysis','other'),
base_price DECIMAL, price_type TEXT('fixed','monthly','hourly','project'),
is_active BOOL, sort_order INT
```

**8. `proposals`** — Full proposal data
```sql
lead_id/client_id UUID FK, proposal_number TEXT UNIQUE(SW-PROP-001),
title TEXT, status TEXT('draft','sent','viewed','accepted','rejected','expired'),
logo_url TEXT, services JSONB, subtotal/discount/tax_amount/total DECIMAL,
validity_days INT DEFAULT 30, ai_intro/ai_why_us/ai_timeline/ai_closing TEXT,
pdf_url TEXT, view_count INT, sent_at/viewed_at/accepted_at/expires_at TIMESTAMPTZ
```

**9. `projects`** — Per-client project tracking
```sql
client_id/proposal_id UUID FK, name TEXT,
status TEXT('planning','active','on_hold','review','completed','cancelled'),
priority TEXT('low','medium','high','urgent'),
start_date/end_date DATE, budget DECIMAL, progress INT(0-100)
```

**10. `tasks`** — Project tasks + subtasks
```sql
project_id/client_id/parent_task_id UUID FK, assigned_to UUID FK,
title TEXT, description TEXT,
status TEXT('todo','in_progress','review','blocked','done','cancelled'),
priority TEXT('low','medium','high','urgent'),
deadline DATE, estimated_hours/actual_hours DECIMAL,
tags TEXT[], attachments JSONB, sort_order INT
```

**11. `task_comments`** — Comments thread per task
**12. `invoices`** — Full invoice with line items, GST, QR
```sql
client_id/project_id/proposal_id UUID FK,
invoice_number TEXT UNIQUE(SW-2026-001),
status TEXT('draft','sent','viewed','paid','partial','overdue','cancelled'),
items JSONB, subtotal/discount/tax_amount/total/amount_paid/amount_due DECIMAL,
due_date DATE, upi_id TEXT, qr_code_url TEXT, reminder_count INT
```

**13. `payments`** — Payment records per invoice
**14. `vault_folders` + `vault_credentials` + `vault_files`** — Encrypted credential + asset storage
**15. `team_invitations`** — Invite tokens + expiry
**16. `notifications`** — In-app notification log per user
**17. `workflow_logs`** — Automation audit trail

### Supabase Storage Buckets (7)
```
proposals  → private (proposal PDFs)
invoices   → private (invoice PDFs + QR codes)
vault      → private (client assets)
logos      → public (company + client logos)
avatars    → public (team member photos)
reports    → private (AI analysis report PDFs)
signatures → private (client signature images)
```

---

## 🔐 AUTH & ROLE SYSTEM

### Role Levels
```javascript
const ROLE_LEVEL = {
  admin: 6, manager: 5, agency: 4,
  developer: 3, designer: 3, client: 1
};
```

### Role Permissions Matrix
| Feature | Admin | Manager | Developer | Designer | Client |
|---|---|---|---|---|---|
| Admin Dashboard | YES | NO | NO | NO | NO |
| Client Hunter (Leads) | YES | YES | NO | NO | NO |
| Proposals | YES | YES | NO | NO | NO |
| All Tasks | YES | YES | NO | NO | NO |
| Own Tasks | YES | YES | YES | YES | NO |
| Payments | YES | YES | NO | NO | NO |
| Vault (All) | YES | YES | NO | NO | NO |
| Vault (Assigned client) | YES | YES | YES | YES | NO |
| Team Module | YES | NO | NO | NO | NO |
| Settings | YES | NO | NO | NO | NO |
| Client Portal | NO | NO | NO | NO | YES |

### Role-Based Sidebar
```
ADMIN:    Dashboard, Lead Management, Proposals, Agreements, Projects/Tasks,
          Finance, Vault, Clients, AI Assistant, Settings (full)

MANAGER:  Dashboard, Lead Management, Proposals, Agreements, Projects/Tasks,
          Finance (limited), Assets (assigned), Clients (view), AI Assistant,
          Settings (limited)

DEVELOPER/DESIGNER: My Dashboard, My Tasks, My Projects, Files, Messages,
                    My Profile, Vault (assigned clients only)

CLIENT:   Client Portal — Projects, Proposals, Agreements, Invoices,
          Messages, Shared Assets
```

---

## 🧭 NAVIGATION STRUCTURE (Sidebar)

```
⚡ StartWebOS [logo]
─────────────────────
🏠 Dashboard
📌 Lead Management
   ↳ Add Lead
   ↳ Lead Scraper
   ↳ CRM
      ↳ All Leads (Kanban/Grid/List)
      ↳ Interested Leads
      ↳ Lost Leads
   ↳ Report Generator
📄 Proposals & Quotations
   ↳ Create Proposal
   ↳ All Proposals
   ↳ All Quotations
   ↳ Approval Tracker
🤝 Agreements
   ↳ Create Agreement
   ↳ All Agreements
   ↳ Pending Signatures
   ↳ Signed Agreements
📋 Projects & Tasks
   ↳ All Projects
   ↳ My Tasks
   ↳ Team Tasks
   ↳ Calendar View
💰 Finance
   ↳ Invoices
   ↳ Payments Received
   ↳ Pending & Overdue
   ↳ Team Payments
   ↳ Expenses
   ↳ Subscriptions & Tools
   ↳ Revenue Dashboard
🔐 Vault
   ↳ Client Accounts
   ↳ Password Manager
   ↳ Asset Library
   ↳ My Tools
👥 Clients
   ↳ All Clients
   ↳ Client Portals
🤖 AI Assistant
⚙️ Settings
   ↳ Agency Branding
   ↳ Business Profile
   ↳ Integrations (WhatsApp, Email, AI/LLM, Data Sources, Payment, Storage)
   ↳ Team Management
   ↳ Notifications
   ↳ Templates
   ↳ Leads Settings
   ↳ Services & Packages
   ↳ Security
   ↳ System Preferences
─────────────────────
[Avatar] Deepak Shekhawat
Admin · v3.0.0
```

### Sidebar Specs
- **Width:** 256px expanded | 72px collapsed | Hidden < 768px
- **Active item:** `border-left: 3px solid var(--orange)` + `background: var(--orange-light)` + orange text + bold
- **Collapsed:** Icons only + tooltip on hover
- **Mobile:** Bottom nav bar (5 icons: Home, Leads, +ADD CTA, Tasks, More)

---

## 📱 LAYOUT SHELL

### Header (60px height)
```
[Collapse Toggle] [Breadcrumb] | [Search ⌘K] [AI Badge] [Bell(count)] [Dark/Light] [Avatar ▾]
```
- Glassfrost + `border-bottom: 1px solid var(--border)`
- **Command Palette (⌘K):** Framer Motion scale-in from center, search all entities
- **Notification Bell:** Slide-in drawer from right (480px), grouped by Today/Yesterday/Earlier

### Mobile Bottom Nav
```
[Home] [Leads] [⊕ ADD] [Tasks] [More]
```
- 64px height + safe-area padding
- Center ADD button = orange circle, elevated, animated pulse ring
- Active = orange icon + orange label + dot indicator

---

## 📋 MODULE SPECIFICATIONS

---

### MODULE 1 — LEAD MANAGEMENT

#### Add Lead Form Fields
**Person:** Full Name, Designation, Phone (WhatsApp checkbox), Email, City, Language Preference
**Business:** Business Name *(duplicate check real-time)*, Category/Industry, Type (Local/Brand/Startup/Enterprise), Website *(duplicate check)*, GMB URL, Address, Maps Link, Years in Business, Employee Count, Revenue Estimate
**Social:** Instagram, Facebook, YouTube, LinkedIn, Twitter — Handle + Follower Count
**Lead Source:** Referral/Cold Outreach/Scraped/Social/Walk-in/Other + Referred By field
**Notes & Tags:** Initial notes, Service interest tags (multi-select), Priority (Low/Medium/High)

**Duplicate Detection:**
- Real-time check on: Phone, Business Name, Website URL, Email
- Confidence levels: Exact Match / Likely Match / Possible Match
- Options: View Existing / Merge / Add Anyway (with reason)
- Orange ⚠️ badge on Lead Card if duplicate

#### Lead Scraper
- **Inputs:** Keyword, Location + Radius, Rating filter, Review count, Has Website (Y/N), GMB (Y/N)
- **Engine:** SerpAPI or Apify (keys from Settings → Integrations)
- **Results:** Grid Card / List Table toggle — columns: Business Name, Category, Location, Phone, Website, Rating, Reviews, GMB, AI Score
- **Per-row actions:** Quick Preview, Add to CRM, AI Analyze, Duplicate Check
- **Bulk:** Select all → Add to CRM (auto duplicate check), AI Score All, Export CSV

#### CRM Views
- **3 views:** Kanban Board / Grid Card / List Table (toggle, preference saved)
- **Kanban columns:** New → Contacted → Report Sent → Interested → Proposal Sent → Negotiation → Won → Lost → Paused
- **Filters:** Source, Industry, City, AI Score, Service Tag, Assigned To, Date, Duplicate Flag
- **Sort:** AI Score / Date / Last Activity / Follow-up Due

#### Lead Card (Grid View)
```
┌─────────────────────────────────────────────────┐
│  [Priority Flag]                [SVG Score: 72] │
│  Border-left: 3px score-color                   │
│  ─────────────────────────────────────────────  │
│  [Building2] Sharma Dental Clinic               │
│              Panvel, Navi Mumbai [Tag: Dental]  │
│  ─────────────────────────────────────────────  │
│  [AlertCircle] No website · Rating 3.2/5        │
│  [Calendar]    Follow-up: Tomorrow              │
│  ─────────────────────────────────────────────  │
│  [MessageSquare] [BarChart2] [FileText] [More]  │
└─────────────────────────────────────────────────┘
```

#### Lead Detail Page (Right Drawer / Full Page)
- **Header bar:** Business name, AI Score badge, status dropdown, assigned to, action buttons always visible:
  CONTACT | GENERATE REPORT | FOLLOW-UP | QUICK PROPOSAL | Edit | Delete | Merge
- **Left:** All lead data (inline editable) + GMB data + website health score + social stats
- **Center (Activity Timeline):** Full chronological log of every action with timestamps + add manual note
- **Right (AI Insights):**
  - Score: 78/100 with breakdown bars
  - Gap Analysis (specific, concrete findings)
  - Recommended Services (priority ranked)
  - Estimated Deal Value
  - Best Time to Contact
  - AI Action Log

#### Contact Modal
- AI-generated message (editable) + Tone selector
- Send via: WhatsApp Web / WhatsApp API / Email
- Send Now / Schedule
- 24-hour timer starts automatically
- Auto-report trigger shown with override toggle

#### Follow-up Modal
- Mode: Auto AI / Manual Notify
- Sequence: Day 3, Day 7, Day 14 (add/remove)
- Message preview per day
- Active / Paused / Stopped status
- **STOP button (red, prominent)**
- Follow-up history: Day, Message, Reply Received (Y/N), Date

#### AI Follow-up Auto-Scheduler (Backend node-cron)
```javascript
// 9:00 AM IST daily
cron.schedule('0 9 * * *', async () => {
  // Get all interested leads with auto_followup=true and next_followup_date <= today
  // Send WhatsApp message using wa.templates.followUp()
  // Update next_followup_date += auto_followup_days
  // Increment followup_count
  // Log to lead_activities + workflow_logs
}, { timezone: 'Asia/Kolkata' });
```

---

### MODULE 2 — PROPOSALS & QUOTATIONS

#### Proposal Builder (5-Step)
1. **Lead Selector** — Search interested leads, click to load data + conversation summary
2. **Service Selector** — From services catalog, multi-select, price override, discount, AI bundle suggestion
3. **AI Content Generation** — Click button → AI fills: Problem statement, solution, timeline, pricing, why us
4. **Builder** — Editable drag-reorder sections:
   Cover Page → Executive Summary → Current Situation → Proposed Solution →
   Service Breakdown → Timeline/Phases → Pricing Table → Why Choose Us →
   Testimonials → Terms & Conditions → Call to Action
5. **Preview & Send** — PDF preview → Send via WhatsApp + Email simultaneously

#### Proposal PDF (10 pages, jsPDF — Dark Theme)
- Dark background (`#05060F`) + orange headings + blue accents
- Cover page: gradient background + agency logo + "Digital Growth Proposal" title + client name + total amount

#### Approval Tracker
- Real-time status: Draft → Sent → Viewed (with timestamp) → Approved / Rejected
- Email open count + link view count + last viewed timestamp
- Live notification: "Client viewed proposal 3 min ago"
- **On Approval → Auto-trigger:** Create Agreement → Create Project → Generate Invoice (all confirmable)
- **On Rejection:** Capture reason → Update CRM → AI suggests revised approach

---

### MODULE 3 — AGREEMENTS

#### Create Agreement (Auto-populated from Proposal)
**Sections:** Parties involved, Scope of work, Deliverables, Timeline & milestones, Payment schedule, Revision policy, IP ownership, Confidentiality, Termination, Dispute resolution, Signatures

#### Signature System
- **Your signature:** Upload image OR draw in-app
- **Client signature options:**
  1. Email link → Client reviews → Signs (draw/type name)
  2. WhatsApp link → Same flow
  3. In-person on screen
- Date auto-stamped on signature
- Signed PDF auto-generated + saved to Vault

#### After Both Sign
- Agreement locked (no edits)
- Saved in Client Vault + Agreements module
- Project auto-created (with AI task list)
- Invoice auto-generated
- Client notified: "Agreement signed. Work begins [date]."
- Admin notified with WA + email

---

### MODULE 4 — PROJECTS & TASKS

#### Project Auto-Creation (on Agreement Sign)
AI reads proposal + agreement → creates:
- Project name, client link, services, start/end dates, budget
- **AI generates:** Project roadmap (phases + dates), Milestone list, Complete task list (per service per phase), Subtasks, Assignee suggestions, Estimated hours, Priority per task, Personal todo list for owner

#### Project Detail Page Structure
**Left Navigation:** Overview, Roadmap, Tasks (All/My/Team/Todo), Files & Assets, Client Updates, Team Notes, Activity Log, Finance

**Task Board (Kanban 4 columns):** Todo → In Progress → In Review → Done
- Per task: Title, Assignee, Priority, Status, Due date, Est. hours, Subtasks count, Comments
- Task detail slide-over: Description, Subtasks, Comments thread, File attachments, Time log, Status

**Client Updates Section:**
- AI pre-written update on milestone complete: "Project is X% complete. This week: [tasks]. Next: [tasks]."
- Send via WhatsApp / Email / Both + schedule option
- Auto send on milestone complete (if setting enabled)

---

### MODULE 5 — FINANCE & PAYMENTS

#### Invoice System
- Auto-generate on proposal acceptance
- Invoice number format: `SW-YYYY-NNN` (sequential, stored in `app_settings.invoice_counter`)
- Line items, GST (configurable), discount, total
- UPI QR code auto-generated per invoice
- Send PDF via Email + WhatsApp

#### Payment Recording
- Full / Partial payment
- Fields: Date, Amount, Mode (UPI/Bank/Cash/Card), Reference number, Screenshot
- Receipt auto-generated on full payment
- `clients.total_billed` and `clients.total_paid` auto-updated

#### Overdue Reminder Scheduler (Backend)
```javascript
// 10:00 AM IST daily
// Send reminders at exactly 7, 14, 30 days overdue
// Email + WhatsApp to client
// In-app notification to admin
// Mark invoice status = 'overdue'
```

#### Revenue Dashboard
- This month: Invoiced vs Collected vs Pending
- 12-month revenue chart (Recharts)
- Top 5 earning clients
- Service-wise revenue breakdown
- AI Revenue Prediction (next month estimate)
- Export financial report PDF

---

### MODULE 6 — VAULT

#### Client Accounts
- Per-client credential storage with categories:
  `hosting | domain | social | cms | ads | email | ftp | analytics | payment | other`
- Per credential: Platform, URL, Username, Encrypted Password, 2FA codes, Recovery email, Notes, Last updated, Shared with (team members)
- Actions: Show/Hide password, Copy, Open URL, Edit, Share with team member, Delete
- Password strength indicator + age alert (6+ months old)

#### Asset Library
- Folders: Logos, Brand Colors (hex swatches), Fonts, Images, Creatives, Documents, Videos
- Google Drive OAuth integration per client
- Browse/sync Drive from within app
- File version history
- Share to Client Portal toggle per file

---

### MODULE 7 — SETTINGS

#### Business Profile (8 Sections)
1. **Agency Identity** — Name, legal name, type, GST, address, tagline, elevator pitch, full description, contact details, business hours, response time promise
2. **Owner Profile** — Full name, designation, bio (short + long), photo, experience, expertise tags, achievements
3. **Services & Expertise** — Per service: detailed description, problem it solves, target client, deliverables, tools, expertise level, case study, industries suited, USPs. Also: services you DON'T offer (AI will never recommend these)
4. **Portfolio & Social Proof** — Client stats, testimonials (with AI usage toggle), case studies (with results/numbers), awards, certifications, media/press
5. **Social & Online Presence** — All platform handles + follower counts, Google rating, content you create
6. **Working Style & Policies** — Step-by-step working process (AI explains to leads), payment policy (advance %, accepted modes, GST), revision policy, communication preferences, project start conditions, minimum budget
7. **Target Audience** — Ideal client profile (business types, size, budget range, location, language), pain points you solve best, clients you DON'T want (AI flags these)
8. **AI Training Preview** — Live preview of AI knowledge base generated from all above sections, full editable system prompt, per-stage message context (first contact, follow-up D3/D7, after report, after proposal, during project, payment reminder, post-project), Test AI button with highlighted data source display

#### Integrations Hub
**WhatsApp (choose one active):**
- WhatsApp Web (QR scan in-app)
- AIsensy (API key + sender name)
- Twilio (Account SID + Auth Token + number)
- Meta Cloud API (Phone number ID + access token + webhook URL)
- Test send button for all options

**Email (multiple for different purposes):**
- Gmail OAuth (free, 500/day limit)
- Brevo/Sendinblue (free 300/day)
- SMTP custom (any provider)
- Mailgun

**AI / LLM:**
- OpenRouter API key
- Model browser with free/paid badges, speed/quality ratings, cost per token
- Per-module model selector (lead scoring, messages, reports, proposals, task generation)
- Monthly token usage dashboard + cost estimator

**Data Sources:** SerpAPI, Apify, GMB OAuth, Google Search Console, Google Analytics, Facebook Graph API

**Payment Gateway:** Razorpay / Stripe / Manual only

**Storage:** Google Drive (agency OAuth + per-client Drive OAuth)

---

### MODULE 8 — TEAM MANAGEMENT

#### Team Notifications (3 channels, independently toggleable per member)

| Trigger | WhatsApp | Email | In-App |
|---|---|---|---|
| New project assigned | YES | YES | YES |
| New task assigned | YES | YES | YES |
| Task overdue | YES | YES | YES |
| @mention in comment | YES | YES | YES |
| Task approved | NO | YES | YES |
| Deadline changed | NO | YES | YES |
| Comment reply | NO | NO | YES |

**WhatsApp Format for Task Assigned:**
```
New Task Assigned
━━━━━━━━━━━━━━━
Task: [Task Name]
Project: [Project Name]
Client: [Client Name]
Priority: HIGH
Due: [Date]
Est. Hours: [X hrs]
Note: [Admin note]
View Task: [app link]
━━━━━━━━━━━━━━━
[Agency Name]
```

#### Team Roles
- **Built-in:** Admin, Manager, Designer, Developer, Content Writer, SEO Specialist, Social Media Executive, Accountant
- **Custom Role Builder:** Name, color, description, module-by-module permission toggles, assign to members

#### Invite Flow
```
Admin enters: name, email, role → [Send Invite]
  → Backend creates team_invitations record (UUID token)
  → Nodemailer sends branded HTML invitation email
  → Member clicks link → /accept-invite?token=UUID
  → AcceptInvitePage: pre-filled name/email + set password
  → Backend: Supabase Auth createUser + create profile + mark invite accepted
  → Admin notification: "[Name] joined as [Role]" (in-app + WhatsApp)
```

---

### MODULE 9 — CLIENT PORTAL

#### Access & Setup
- URL: `/client/:portalToken` (token-based, no Supabase Auth for client)
- Admin sends invite link from client profile
- Client sets password → accesses branded portal
- Mobile-first, responsive

#### Client Views
1. **Dashboard** — Active projects count, pending approvals, upcoming payments, unread messages + progress rings
2. **My Projects** — Progress bar, deadline, milestones, received updates, shared files (download only). NO access to internal tasks or team notes
3. **Proposals & Quotations** — View → Approve / Reject / Request Change
4. **Agreements** — Sign (draw/type) → Download signed PDF
5. **Invoices & Payments** — View, download PDF, Pay Now (if gateway connected), payment history
6. **Messages** — Simple thread with agency + file attachments
7. **Shared Assets** — Files shared from project vault → download individually or ZIP

---

### MODULE 10 — AI ASSISTANT

#### AI Chat (Floating button, always visible)
Example queries:
- "Show leads not contacted in 5+ days"
- "Generate follow-up message for [lead]"
- "What's my revenue this month?"
- "Which tasks are overdue?"
- "Draft client update for [project]"

#### AI Automation Engine (Background, Always Running)
| Trigger | AI Action |
|---|---|
| Lead added | Score + gap analysis + service recommendations |
| WhatsApp reply received | Mark interested + notify + start 24hr timer |
| 24hr after contact, no report | Auto-generate + send report (if setting ON) |
| No reply after Day 3 | Auto follow-up message |
| Proposal approved | Create agreement draft → notify |
| Agreement signed by both | Create project + generate task list + create invoice |
| Task overdue | Notify assignee + notify admin |
| Milestone complete | Draft client update + notify for approval |
| Invoice overdue | Payment follow-up sequence |
| Tool renewal in 7 days | Renewal alert |
| Lead cold 14 days | Re-engagement suggestion |
| Password 6+ months old | Vault update reminder |

#### AI Service Layer (`client/src/lib/ai/index.js`)
```javascript
// Universal AI router — supports: claude, openai, gemini, openrouter
export async function callAI({ prompt, systemPrompt, maxTokens = 2000 }) {
  // Get active provider + model + API key from useSettingsStore
  // Call appropriate provider function
  // Race with 30-second timeout
  // Normalize errors: 401=Invalid key, 429=Rate limit, 408=Timeout, 500=Server error
}

// Key prompt builders:
export function buildLeadAnalysisPrompt(lead) // → JSON: scores, pain points, opportunities, hook message
export function buildProposalPrompt(lead, services) // → JSON: intro, why us, timeline, closing
export function buildTaskListPrompt(services, clientName) // → JSON array of tasks with priority + hours
```

---

## 🔔 NOTIFICATION SYSTEM

### Complete Notification Event List

**Lead & CRM:**
- New lead added (manual/scraped), Lead reply received (WA), Duplicate detected, Follow-up due (Day 3/7/14), Lead going cold (X days no contact), Report auto-sent, AI scoring complete, Lead marked Lost

**Proposals:**
- Proposal in draft >2 days, Proposal sent, Client opened proposal, Proposal approved, Proposal rejected, Proposal expiry approaching (2 days), Proposal expired

**Agreements:**
- Agreement sent, Client signed, Pending signature >3 days, Auto-reminder sent

**Projects & Tasks:**
- New project created, Task due today, Task overdue, Task assigned, Task completed, Milestone complete, Project deadline approaching (3 days), Project deadline overdue, No project activity in 5 days

**Finance:**
- Payment received, Invoice overdue (day of), Invoice due in 3 days, Invoice overdue follow-up sent, Recurring invoice due, Subscription renewal in 7 days / 1 day, Team payment recorded

**Vault & System:**
- Password 6+ months old, Drive sync error, Vault accessed by team member, AI task completed, AI action failed, API limit approaching, WhatsApp disconnected, New team member login, Unauthorized login attempt

### Notification Bell Categories
```
🔴 Urgent   — overdue, unanswered leads, payment critical
🟡 Reminder — follow-ups, renewals, approaching deadlines
🟢 Updates  — reply received, proposal approved, task complete
ℹ️ Info     — team activity, AI actions completed
```

### Notification Delivery Options (per alert type)
- In-app notification bell
- WhatsApp message to you
- Email
- Daily digest (bundle instead of instant)
- Quiet hours: Do not disturb X to Y time

---

## 🔄 AUTO WORKFLOW ENGINE

### Scheduler Jobs (server/services/schedulerService.js)
```javascript
cron.schedule('0 9 * * *',  autoFollowUpJob,          { timezone: 'Asia/Kolkata' }); // Lead follow-ups
cron.schedule('0 8 * * *',  taskReminderJob,           { timezone: 'Asia/Kolkata' }); // Task reminders to team
cron.schedule('0 10 * * *', invoiceOverdueJob,         { timezone: 'Asia/Kolkata' }); // Invoice overdue check
cron.schedule('0 * * * *',  proposalExpiryJob);                                        // Hourly proposal expiry
cron.schedule('0 23 * * *', refreshDashboardInsightsJob, { timezone: 'Asia/Kolkata' }); // AI insights refresh
cron.schedule('*/30 * * * *', checkWAMessagesJob);                                     // WA reply check
```

### Complete Auto Workflow
```
LEAD SCRAPED/ADDED
  ↓ Duplicate check auto-runs
  ↓ AI scores + gap analysis + service recommendations
  ↓ Contact sent via WhatsApp (AI message)
NO REPLY → Day 3 Auto Follow-up → Day 7 → Day 14
REPLY RECEIVED → Mark Interested → Admin Notified
  ↓ 24hr timer → Report auto-generated + sent (if no manual action)
PROPOSAL CREATED (AI-assisted)
  ↓ Sent → Tracking ON (open/view counted)
CLIENT VIEWS → Admin notified instantly
CLIENT APPROVES → Agreement auto-drafted
AGREEMENT SENT → Client signs on portal/link
BOTH SIGNED:
  → Project auto-created
  → AI Task List generated
  → Todo list for admin
  → Invoice generated (SW-YYYY-NNN)
  → Client notified project starts
TASKS ASSIGNED → Team notified (WhatsApp + Email + In-App)
WORK IN PROGRESS:
  → Milestone complete → Client update auto-drafted → Sent
  → Weekly AI update every Monday
PROJECT COMPLETE → Client notified → Review requested
FINAL INVOICE → Payment follow-up sequence (if pending)
PAYMENT RECEIVED → Receipt generated → Revenue dashboard updated
CLIENT ASSETS → Stored in Vault
```

---

## 📧 EMAIL SYSTEM (Nodemailer Templates)

All emails: HTML, branded, mobile-responsive, dark glassfrost header with orange gradient
**Templates required:**
1. `proposalSent` — Client name, proposal title, total, view link, validity date
2. `invoiceSent` — Invoice number, amount, due date, pay link, UPI QR attachment
3. `taskReminder` — Member name, table of overdue tasks (title, client, priority, deadline)
4. `teamInvite` — Invitee name, role, inviter name, setup link button
5. `proposalAccepted` — Confirmation to admin + client
6. `paymentReceived` — Receipt to client
7. `invoiceOverdue` — Days overdue, amount, pay link
8. `projectStarted` — Welcome to client, portal link
9. `agreementSigned` — Both parties confirmation

---

## 📲 WHATSAPP SYSTEM (Meta Cloud API)

**Phone format:** Strip non-digits → prepend `91` if not present → POST to Meta Graph API
**All sends logged** to `whatsapp_messages` table

**Message Templates:**
```javascript
proposalSent(name, title, link)
proposalAccepted(name)
invoiceSent(name, number, amount, due, link)
paymentReceived(name, amount, invoice)
taskReminder(name, taskTitle, deadline)
reportReady(name, link)
followUp(name, businessName)
projectStarted(name, projectName)
invoiceOverdue(name, amount, daysOverdue)
leadHook(message) // Raw AI-generated outreach
```

---

## 📊 ADMIN SUPER DASHBOARD

### Layout
```
GREETING: "Good morning, Deepak! Today: 3 tasks due · 2 proposals pending · ₹45K payment due"

ROW 1 — STAT CARDS (glassfrost colored, count-up animation, sparkline)
[Total Leads: 142] [Hot Leads: 23] [Monthly Revenue: ₹1.85L] [Active Projects: 8]
blue-glass          orange-glass    emerald-glass             purple-glass

ROW 2 — CHARTS
[Pipeline Funnel Chart: 55%] | [Revenue 12-month Trend: 45%]

ROW 3 — TABLES
[Priority Leads (follow-up due): 55%] | [Follow-ups Due Today: 45%]

ROW 4 — PROGRESS
[Active Projects Progress: 55%] | [Team Workload: 45%]

ROW 5 — FEEDS
[Recent Activity Feed] | [Pending Invoices]

AI INSIGHTS STRIP — 3 pills refreshed nightly
```

### StatCard Spec
- Glassfrost colored card (8 variants matching brand colors)
- Large number: Plus Jakarta Sans, text-4xl, font-extrabold
- Trend: ArrowUpRight/ArrowDownRight + percentage change (emerald=up, crimson=down)
- Mini Recharts sparkline (no axes, gradient area, 8 data points)
- Icon pill (colored bg + Lucide icon, 24px)
- Hover: translateY(-3px) + colored glow shadow
- Mount: count-up animation (Framer Motion useMotionValue)

---

## 📱 RESPONSIVE BREAKPOINTS

| Range | Layout |
|---|---|
| < 640px (Mobile) | Sidebar hidden, bottom nav, single column stats, Kanban = stage selector + 1 column, modals = full-screen bottom sheet |
| 640–1024px (Tablet) | Sidebar collapsed (72px) default, 2×2 stats grid, 3 Kanban columns, 75vw slide-over panels |
| > 1024px (Desktop) | Full 256px sidebar, 4-stat row, all 8 Kanban columns, 640px right drawer |
| > 1440px (Large) | Max content 1600px, 5-6 Kanban visible, 3-column dashboard |

### Touch DnD Config
```javascript
useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
useSensor(KeyboardSensor)
```

---

## 🔌 COMPLETE API ROUTES

```
AUTH:       POST /api/auth/login | GET /api/auth/me | POST /api/auth/accept-invite/:token

LEADS:      GET/POST /api/leads | PUT/DELETE /api/leads/:id
            POST /api/leads/scrape | POST /api/leads/:id/analyze
            POST /api/leads/:id/whatsapp | POST /api/leads/:id/send-report
            PUT /api/leads/:id/stage | POST /api/leads/bulk-analyze

PROPOSALS:  GET/POST /api/proposals | PUT /api/proposals/:id
            POST /api/proposals/:id/send | POST /api/proposals/:id/accept
            POST /api/proposals/:id/reject | GET /api/proposals/:id/view

TASKS:      GET/POST /api/tasks | PUT/DELETE /api/tasks/:id
            GET/POST /api/tasks/:id/comments

PAYMENTS:   GET/POST /api/invoices | PUT /api/invoices/:id
            POST /api/invoices/:id/send | POST /api/invoices/:id/payment
            POST /api/invoices/:id/generate-qr
            GET /api/payments/client/:id

VAULT:      GET /api/vault/client/:id | POST /api/vault/folders
            POST /api/vault/credentials | PUT/DELETE /api/vault/credentials/:id
            POST /api/vault/files/upload

TEAM:       GET /api/team | POST /api/team/invite | PUT/DELETE /api/team/:id

SETTINGS:   GET/PUT /api/settings | POST /api/settings/test-ai
            POST /api/settings/test-wa | POST /api/settings/test-email

NOTIFICATIONS: GET /api/notifications | PUT /api/notifications/read-all
               PUT /api/notifications/:id/read

CLIENT PORTAL: GET /api/client-portal/:token
               GET /api/client-portal/:token/projects
               GET /api/client-portal/:token/invoices
               GET /api/client-portal/:token/reports
               POST /api/client-portal/:token/accept-proposal
```

---

## 🏗️ BUILD ORDER (16 Phases)

| Phase | What to Build | Days |
|---|---|---|
| 1 | Monorepo structure, Vite+React, Express, Tailwind, Glassfrost CSS, Supabase schema (all 15 tables), 7 storage buckets, `.env` files | 1-2 |
| 2 | Auth system: LoginPage (animated, mesh bg), useAuthStore, profile creation, useRoleGuard, AuthRoute/AdminRoute, AcceptInvitePage, role-based redirect | 3 |
| 3 | Layout shell: DashboardLayout, Sidebar (full spec, role-filtered, collapsible, Framer transitions), Header (search, bell, avatar), MobileNav, ThemeToggle | 4 |
| 4 | Shared components: GlassCard (8 variants), StatCard (sparkline+count-up), ScoreBadge (SVG), LoadingSkeleton, EmptyState, StatusBadge, PriorityBadge, ConfirmDialog, NotificationDrawer, CommandPalette | 5 |
| 5 | Settings page: AI Models, WhatsApp, Email, Company tabs — save to Supabase `app_settings` | 6 |
| 6 | AI service layer: provider files (claude, openai, gemini, openrouter), universal `callAI()`, prompt builders, error handling, 30s timeout | 7 |
| 7 | Client Hunter (Lead Management): Scraper backend, AddLeadModal, Kanban board (DnD), LeadCard, LeadDetailPanel, AI Analysis, Report PDF, WhatsApp modal, Auto follow-up scheduler | 8-10 |
| 8 | Proposal Builder: Services catalog CRUD + seed, ProposalList, 5-step builder, AI content, jsPDF export, Send via email+WA, Acceptance auto-workflow (client+project+invoice) | 11-13 |
| 9 | Projects & Tasks: ProjectList, TaskBoard (DnD 4 columns), TaskCard, TaskModal, TaskAssigner, TaskComments, Daily reminder cron 8AM IST, Progress auto-calculation | 14-15 |
| 10 | Finance: InvoiceList, InvoiceBuilder, InvoiceDetail, Invoice PDF (jsPDF), QR generation, PaymentRecordModal, Per-client payment dashboard, Overdue reminder cron | 16-17 |
| 11 | Vault: VaultDashboard (per-client), ClientVault (folders+files+credentials), FileUploader → Supabase Storage, CredentialModal, CredentialCard, Role-based visibility, Google Drive OAuth | 18-19 |
| 12 | Team Module: TeamDashboard (member cards + workload), InviteMemberModal → Nodemailer email, AcceptInvitePage → Supabase Auth, Role management, Daily task email cron | 20 |
| 13 | Admin Super Dashboard: All 6 stat cards, Pipeline funnel chart, Revenue trend, Activity feed, Follow-ups section, Team workload, AI insights strip (3 cards, daily refresh) | 21 |
| 14 | Role Dashboards + Client Portal: DeveloperDashboard, DesignerDashboard, ManagerDashboard, ClientLogin (token-based), ClientDashboard, Projects, Invoices, Reports, UPI payment flow | 22-23 |
| 15 | Notifications & Realtime: Supabase Realtime subscriptions, NotificationDrawer fully wired, Bell badge count live, Toast notifications for all key events | 24 |
| 16 | Polish & Production: All breakpoints tested (320px→1920px), Dark mode audit, Loading skeletons everywhere, Empty states, Error boundaries, 0 console.error, Lighthouse >90, Mobile DnD tested | 25-26 |

---

## 🌐 ENVIRONMENT VARIABLES

### `client/.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:5000
```

### `server/.env`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   ← NEVER expose to frontend
JWT_SECRET=startwebos_jwt_2026_deepak
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🎯 DEFAULT SERVICES SEED (14 services)

| Service | Category | Base Price | Type |
|---|---|---|---|
| Website Design | web | ₹15,000 | fixed |
| Website Development | web | ₹25,000 | fixed |
| E-commerce Website | web | ₹45,000 | fixed |
| SEO Package | seo | ₹8,000 | monthly |
| Google My Business | marketing | ₹5,000 | fixed |
| Social Media Management | social | ₹6,000 | monthly |
| Logo & Branding | design | ₹4,000 | fixed |
| Google Ads | ads | ₹5,000 | monthly |
| Meta Ads | ads | ₹4,500 | monthly |
| Content Writing | content | ₹3,000 | monthly |
| WhatsApp Marketing | marketing | ₹4,000 | fixed |
| Business Analysis | analysis | ₹2,000 | fixed |
| Email Marketing | marketing | ₹3,500 | monthly |
| Video Editing | design | ₹5,000 | monthly |

---

## ✅ QUALITY CHECKLIST (Before Marking Any Module Complete)

- [ ] Works in Light mode AND Dark mode (every element)
- [ ] Works at 320px, 375px, 768px, 1024px, 1440px
- [ ] Glassfrost applied to all surfaces (blur + border + shadow)
- [ ] All data states covered: Loading skeleton, Empty state, Error state, Populated state
- [ ] Role permissions enforced on this module's routes (frontend + backend)
- [ ] All actions trigger correct notifications (in-app + WA + email per matrix)
- [ ] All WA messages logged to `whatsapp_messages` table
- [ ] All automations logged to `workflow_logs` table
- [ ] No `console.error` in production
- [ ] Touch DnD works if Kanban used
- [ ] Score rings are SVG (not CSS tricks)
- [ ] Framer Motion animations applied (page transitions, modals, drawers)
- [ ] Supabase service key NOT referenced in any frontend file
- [ ] RLS policies active on all tables touched by this module

---

*StartWebOS Ultra Master Prompt v3.0*
Company: StartWeb | Location: Panvel, Navi Mumbai*
*Stack: React 18 + Vite (JS) · Node.js + Express · Supabase · Glassfrost UI v3*
*Version: 3.0.0 | Status: PRODUCTION-READY SPEC | Build time: ~26 days*