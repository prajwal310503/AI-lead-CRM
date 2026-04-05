const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function getSettings() {
  const { data } = await supabase.from('app_settings').select('*').limit(1).single()
  return data || {}
}

async function logWorkflow(workflow, status, message, details = {}) {
  await supabase.from('workflow_logs').insert({ workflow, status, message, details })
}

// ─── 9:00 AM IST — WhatsApp Intro Auto-send + Follow-ups (Day 3/7/14) ────
const FOLLOWUP_DAYS = [3, 7, 14]
const STOP_STAGES   = ['proposal_sent', 'negotiation', 'converted', 'lost']

function daysBetween(a, b) {
  return Math.floor((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24))
}

cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Running WhatsApp intro + follow-up jobs...')
  const now      = new Date()
  const settings = await getSettings()

  const { triggerFollowup } = require('./whatsappIntroService')

  // ── Part A: Send intro to new leads that haven't gotten one yet ──
  if (settings.whatsapp_enabled && settings.wa_auto_intro) {
    const { data: newLeads } = await supabase
      .from('leads')
      .select('*')
      .or('whatsapp_intro_sent.is.null,whatsapp_intro_sent.eq.false')
      .not('phone', 'is', null)
      .not('status', 'in', '("converted","lost")')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // last 24h only

    let introsSent = 0
    for (const lead of newLeads || []) {
      try {
        const { triggerIntro } = require('./whatsappIntroService')
        await triggerIntro(lead, settings, null)
        introsSent++
      } catch (e) {
        console.error('[CRON] Intro error for', lead.business_name, e.message)
      }
    }
    if (introsSent) console.log(`[CRON] Sent ${introsSent} intro messages`)
  }

  // ── Part B: Follow-ups for leads with intro sent but no reply ──
  if (settings.whatsapp_enabled && settings.wa_followup_enabled !== false) {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('whatsapp_intro_sent', true)
      .is('whatsapp_last_reply_at', null) // no reply yet
      .not('phone', 'is', null)

    const eligible = (leads || []).filter(l => !STOP_STAGES.includes(l.status))
    let sent = 0

    for (const lead of eligible) {
      const refDate    = lead.whatsapp_intro_sent_at || lead.last_contacted_at || lead.created_at
      if (!refDate) continue
      const daysSince  = daysBetween(now, new Date(refDate))
      const alreadySent = lead.followup_count || 0

      let targetDay = null
      for (const d of FOLLOWUP_DAYS) {
        if (daysSince >= d && alreadySent < FOLLOWUP_DAYS.indexOf(d) + 1) { targetDay = d; break }
      }
      if (!targetDay) continue

      try {
        await triggerFollowup(lead, targetDay, settings)
        sent++
        console.log(`[CRON] Follow-up day-${targetDay} → ${lead.business_name}`)
      } catch (e) {
        console.error('[CRON] Follow-up error for', lead.business_name, e.message)
      }
    }

    await logWorkflow('lead_followup', 'success', `Sent ${sent} follow-ups`, { eligible: eligible.length })
  }
}, { timezone: 'Asia/Kolkata' })

// ─── 8:00 AM IST — Task Reminders ─────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  console.log('[CRON] Running task reminders...')
  const { data: profiles } = await supabase.from('profiles').select('id, name, email, phone').eq('is_active', true)
  if (!profiles?.length) return

  const settings = await getSettings()
  const { sendTaskReminder } = require('./whatsappService')
  const { sendTaskReminderEmail } = require('./emailService')
  const today = new Date().toISOString().split('T')[0]
  let count = 0

  for (const profile of profiles) {
    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', profile.id).in('status', ['todo', 'in_progress', 'review']).lte('deadline', today)
    if (!tasks?.length) continue
    try {
      if (profile.phone) await sendTaskReminder({ phone: profile.phone, name: profile.name, count: tasks.length, date: today, settings })
      if (profile.email && settings.smtp_user) await sendTaskReminderEmail({ to: profile.email, name: profile.name, tasks, settings })
      count++
    } catch (e) {
      console.error('[CRON] Task reminder error:', e.message)
    }
  }
  await logWorkflow('task_reminders', 'success', `Sent reminders to ${count} members`)
}, { timezone: 'Asia/Kolkata' })

// ─── 10:00 AM IST — Invoice Overdue Checks ────────────────────────────────
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Checking overdue invoices...')
  const today = new Date()
  const { data: invoices } = await supabase.from('invoices').select('*, clients(name, email, phone)').in('status', ['sent', 'partial', 'overdue'])
  if (!invoices?.length) return

  const settings = await getSettings()
  const { sendInvoiceOverdue } = require('./whatsappService')
  let count = 0

  for (const inv of invoices) {
    const due = new Date(inv.due_date)
    const days = Math.floor((today - due) / (1000 * 60 * 60 * 24))
    if (days <= 0) continue
    if (![7, 14, 30].includes(days)) continue

    try {
      await supabase.from('invoices').update({ status: 'overdue', reminder_count: (inv.reminder_count || 0) + 1, last_reminder: new Date().toISOString() }).eq('id', inv.id)
      const client = inv.clients
      const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.amount_due)
      if (client?.phone) await sendInvoiceOverdue({ phone: client.phone, name: client.name, amount, days, settings })
      count++
    } catch (e) {
      console.error('[CRON] Overdue check error:', e.message)
    }
  }
  await logWorkflow('invoice_overdue', 'success', `Processed ${count} overdue reminders`)
}, { timezone: 'Asia/Kolkata' })

// ─── Every Hour — Proposal Expiry Check ───────────────────────────────────
cron.schedule('0 * * * *', async () => {
  const now = new Date().toISOString()
  await supabase.from('proposals').update({ status: 'expired' }).in('status', ['sent', 'viewed']).lt('expires_at', now)
}, { timezone: 'Asia/Kolkata' })

console.log('[Scheduler] All cron jobs registered (Asia/Kolkata timezone)')
