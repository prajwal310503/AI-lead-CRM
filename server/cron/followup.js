/**
 * Auto Follow-up Engine
 * Cron: 9:00 AM IST every day
 * Logic: Find interested leads with auto_followup = true
 *        Send follow-up messages at Day 3, Day 7, Day 14 from last_contacted_at
 *        Stop if lead status has progressed past 'interested'
 */

const cron    = require('node-cron')
const axios   = require('axios')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key — bypasses RLS
)

// Days at which follow-ups are sent
const FOLLOWUP_DAYS = [3, 7, 14]

// Stages where auto follow-up should stop (lead has progressed)
const STOP_STAGES = ['proposal_sent', 'negotiation', 'converted', 'lost']

function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((new Date(dateA) - new Date(dateB)) / msPerDay)
}

function buildFollowupMessage(lead, day) {
  const name = lead.owner_name || 'Sir/Ma\'am'
  const biz  = lead.business_name
  const msgs = {
    3: `Hi ${name}! Just following up on my message about ${biz}'s digital growth. We've helped similar ${lead.industry || 'businesses'} in ${lead.city || 'your area'} grow 30-50% online. Would love to share a quick strategy — 10 mins call?`,
    7: `Hello ${name}, hope all's well at ${biz}! I noticed your Google presence could be much stronger. We just helped a ${lead.industry || 'similar business'} in ${lead.city || 'your city'} go from 20 to 200+ monthly leads. Can I send you a free audit?`,
    14: `Hi ${name}! Last follow-up from StartWeb — I have a ready proposal for ${biz} that includes website + GMB + social media. Investment starts at ₹9,999/mo with guaranteed results. Shall I send it?`,
  }
  return msgs[day] || msgs[3]
}

async function runFollowupEngine() {
  console.log(`[FollowupCron] Running at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`)

  try {
    // Fetch all leads eligible for auto follow-up
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('auto_followup', true)
      .not('status', 'in', `(${STOP_STAGES.map(s => `"${s}"`).join(',')})`)
      .not('phone', 'is', null)

    if (error) { console.error('[FollowupCron] DB error:', error.message); return }
    if (!leads?.length) { console.log('[FollowupCron] No eligible leads'); return }

    console.log(`[FollowupCron] Checking ${leads.length} leads...`)
    const now = new Date()
    let sent = 0

    for (const lead of leads) {
      const refDate = lead.last_contacted_at || lead.created_at
      if (!refDate) continue

      const daysSince = daysBetween(now, new Date(refDate))
      const followupsSent = lead.followup_count || 0

      // Determine which day tier to send
      let targetDay = null
      for (const d of FOLLOWUP_DAYS) {
        if (daysSince >= d && followupsSent < FOLLOWUP_DAYS.indexOf(d) + 1) {
          targetDay = d
          break
        }
      }
      if (!targetDay) continue

      const message = buildFollowupMessage(lead, targetDay)
      const waLink  = `https://wa.me/91${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

      // Log to whatsapp_messages
      await supabase.from('whatsapp_messages').insert({
        lead_id:      lead.id,
        user_id:      lead.created_by || null,
        phone:        lead.phone,
        message,
        message_type: `followup_day_${targetDay}`,
        sent_at:      now.toISOString(),
        wa_link:      waLink,
        auto_sent:    true,
      }).catch(err => console.warn('[FollowupCron] whatsapp_messages insert skipped:', err.message))

      // Log lead activity
      await supabase.from('lead_activities').insert({
        lead_id:     lead.id,
        user_id:     lead.created_by || null,
        type:        'auto_followup',
        title:       `Auto Follow-up Day ${targetDay} Sent`,
        description: message.slice(0, 120),
      }).then(null, () => {})

      // Log workflow
      await supabase.from('workflow_logs').insert({
        entity_type: 'lead',
        entity_id:   lead.id,
        user_id:     lead.created_by || null,
        action:      'auto_followup_sent',
        metadata:    { day: targetDay, phone: lead.phone },
      }).then(null, () => {})

      // Update followup_count + last_followup_sent_at
      await supabase.from('leads').update({
        followup_count:        followupsSent + 1,
        last_followup_sent_at: now.toISOString(),
        updated_at:            now.toISOString(),
      }).eq('id', lead.id)

      // In-app notification to assigned user
      if (lead.created_by) {
        await supabase.from('notifications').insert({
          user_id: lead.created_by,
          type:    'followup_sent',
          title:   `Follow-up Sent — ${lead.business_name}`,
          message: `Day ${targetDay} auto follow-up sent to ${lead.phone}`,
          read:    false,
        }).then(null, () => {})
      }

      sent++
      console.log(`[FollowupCron] Sent day-${targetDay} to ${lead.business_name} (${lead.phone})`)
    }

    console.log(`[FollowupCron] Done — ${sent} messages queued`)
  } catch (err) {
    console.error('[FollowupCron] Fatal error:', err.message)
  }
}

// ── Schedule: 9:00 AM IST = 03:30 UTC ──────────────────────────────────────
cron.schedule('30 3 * * *', runFollowupEngine, {
  scheduled: true,
  timezone: 'Asia/Kolkata',
})

// Also expose manual trigger for testing
module.exports = { runFollowupEngine }
