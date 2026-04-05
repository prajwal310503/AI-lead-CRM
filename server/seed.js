/**
 * StartWebOS — Supabase Seed Script
 * Run: node server/seed.js
 *
 * Creates:
 *   - Admin user (deepak@startweb.cloud) via Supabase Auth
 *   - Profile row in `profiles` table
 *   - App settings row in `app_settings`
 *   - 15 sample leads in `leads`
 */

require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ADMIN_EMAIL = 'deepak@startweb.cloud'
const ADMIN_PASSWORD = 'Admin@StartWeb2026'
const ADMIN_NAME = 'Deepak Shekhawat'

const STAGES = ['cold', 'contacted', 'warm', 'hot', 'proposal_sent', 'negotiation', 'converted', 'lost']

const SAMPLE_LEADS = [
  { name: 'Rajesh Sharma', business_name: 'TechVision Solutions', email: 'rajesh@techvision.in', phone: '9876543210', city: 'Mumbai', business_type: 'IT Consulting', website: 'https://techvision.in', stage: 'hot', budget: 80000, source: 'LinkedIn' },
  { name: 'Priya Patel', business_name: 'Bloom Boutique', email: 'priya@bloomboutique.in', phone: '9823456789', city: 'Pune', business_type: 'E-commerce', website: '', stage: 'warm', budget: 45000, source: 'Instagram' },
  { name: 'Anil Verma', business_name: 'GreenPath Organic', email: 'anil@greenpath.co', phone: '9765432109', city: 'Navi Mumbai', business_type: 'D2C Brand', website: 'https://greenpath.co', stage: 'contacted', budget: 60000, source: 'WhatsApp' },
  { name: 'Sunita Rao', business_name: 'LegalEase Advisory', email: 'sunita@legalease.in', phone: '9654321098', city: 'Thane', business_type: 'Legal Services', website: '', stage: 'proposal_sent', budget: 120000, source: 'Referral' },
  { name: 'Kiran Mehta', business_name: 'FitLife Studio', email: 'kiran@fitlife.in', phone: '9543210987', city: 'Mumbai', business_type: 'Fitness', website: 'https://fitlife.in', stage: 'negotiation', budget: 35000, source: 'Cold Call' },
  { name: 'Vikram Singh', business_name: 'AutoParts Hub', email: 'vikram@autopartshub.in', phone: '9432109876', city: 'Panvel', business_type: 'Automotive', website: '', stage: 'cold', budget: 50000, source: 'LinkedIn' },
  { name: 'Meera Iyer', business_name: 'CaféBliss', email: 'meera@cafebliss.in', phone: '9321098765', city: 'Vashi', business_type: 'F&B', website: 'https://cafebliss.in', stage: 'warm', budget: 40000, source: 'Instagram' },
  { name: 'Deepak Nair', business_name: 'SmartEdu Academy', email: 'deepak@smartedu.in', phone: '9210987654', city: 'Belapur', business_type: 'EdTech', website: 'https://smartedu.in', stage: 'converted', budget: 90000, source: 'Website' },
  { name: 'Pooja Gupta', business_name: 'HealthFirst Clinic', email: 'pooja@healthfirst.in', phone: '9109876543', city: 'Kharghar', business_type: 'Healthcare', website: '', stage: 'hot', budget: 75000, source: 'Referral' },
  { name: 'Rohit Joshi', business_name: 'CloudBit Technologies', email: 'rohit@cloudbit.in', phone: '9098765432', city: 'Mumbai', business_type: 'SaaS', website: 'https://cloudbit.in', stage: 'contacted', budget: 150000, source: 'LinkedIn' },
  { name: 'Anita Desai', business_name: 'HomeDecor Palace', email: 'anita@homedecorpalace.in', phone: '8987654321', city: 'Pune', business_type: 'Interior Design', website: '', stage: 'warm', budget: 55000, source: 'Instagram' },
  { name: 'Sanjay Kumar', business_name: 'LogiExpress', email: 'sanjay@logiexpress.in', phone: '8876543210', city: 'Navi Mumbai', business_type: 'Logistics', website: 'https://logiexpress.in', stage: 'cold', budget: 70000, source: 'Cold Email' },
  { name: 'Lakshmi Reddy', business_name: 'SpiceRoute Restaurant', email: 'lakshmi@spiceroute.in', phone: '8765432109', city: 'Airoli', business_type: 'Restaurant', website: '', stage: 'proposal_sent', budget: 30000, source: 'Walk-in' },
  { name: 'Nitin Shah', business_name: 'PropSmart Realty', email: 'nitin@propsmart.in', phone: '8654321098', city: 'Panvel', business_type: 'Real Estate', website: 'https://propsmart.in', stage: 'lost', budget: 200000, source: 'LinkedIn' },
  { name: 'Divya Nambiar', business_name: 'WeddingWorks Events', email: 'divya@weddingworks.in', phone: '8543210987', city: 'Nerul', business_type: 'Events', website: 'https://weddingworks.in', stage: 'negotiation', budget: 85000, source: 'Referral' },
]

async function seed() {
  console.log('🌱 Starting StartWebOS seed...\n')

  // ── 1. Create admin user ──────────────────────────────────────────────────
  console.log(`Creating admin user: ${ADMIN_EMAIL}`)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME },
  })

  if (authError && !authError.message.includes('already registered')) {
    console.error('❌ Auth error:', authError.message)
    process.exit(1)
  }

  const userId = authData?.user?.id
  if (!userId) {
    // User already exists — fetch their ID
    const { data: listData } = await supabase.auth.admin.listUsers()
    const existing = listData?.users?.find(u => u.email === ADMIN_EMAIL)
    if (!existing) {
      console.error('❌ Could not find or create admin user')
      process.exit(1)
    }
    console.log('   ℹ️  Admin user already exists, using existing ID')
    await seedProfile(existing.id)
    await seedSettings()
    await seedLeads(existing.id)
  } else {
    console.log(`   ✅ Admin user created: ${userId}`)
    await seedProfile(userId)
    await seedSettings()
    await seedLeads(userId)
  }

  console.log('\n✅ Seed complete!')
  console.log(`\nLogin at: http://localhost:5173/login`)
  console.log(`Email:    ${ADMIN_EMAIL}`)
  console.log(`Password: ${ADMIN_PASSWORD}`)
}

async function seedProfile(userId) {
  console.log('\nCreating admin profile...')
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    phone: '+91 98765 00000',
    avatar_url: null,
  }, { onConflict: 'id' })
  if (error) console.error('   ⚠️  Profile error:', error.message)
  else console.log('   ✅ Profile created')
}

async function seedSettings() {
  console.log('\nCreating app settings...')
  const { error } = await supabase.from('app_settings').upsert({
    id: 1,
    company_name: 'StartWeb',
    company_email: 'hello@startweb.cloud',
    company_phone: '+91 98765 00001',
    company_website: 'https://startweb.cloud',
    company_address: 'Panvel, Navi Mumbai, Maharashtra 410206',
    currency: 'INR',
    tax_rate: 18,
    upi_id: 'startweb@upi',
    ai_provider: 'openai',
  }, { onConflict: 'id' })
  if (error) console.error('   ⚠️  Settings error:', error.message)
  else console.log('   ✅ App settings created')
}

async function seedLeads(userId) {
  console.log('\nSeeding 15 sample leads...')
  const leads = SAMPLE_LEADS.map((l, i) => ({
    ...l,
    created_by: userId,
    pain_points: ['No online presence', 'Low digital visibility'],
    opportunities: ['SEO growth potential', 'Social media expansion'],
    overall_score: Math.floor(Math.random() * 40) + 50,
    follow_up_date: new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: `Initial contact made. Interested in web development services.`,
  }))

  const { error } = await supabase.from('leads').insert(leads)
  if (error) console.error('   ⚠️  Leads error:', error.message)
  else console.log(`   ✅ ${leads.length} leads seeded`)
}

seed().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
