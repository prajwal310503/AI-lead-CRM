const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * Create a single in-app notification for a user.
 */
async function createNotification(userId, { title, message, type = 'info', link = null, metadata = {} }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, title, message, type, link, metadata })
    .select()
    .single()
  if (error) console.error('[notification] insert error:', error.message)
  return data
}

/**
 * Notify all admin users.
 */
async function notifyAllAdmins(notification) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
  for (const admin of admins || []) {
    await createNotification(admin.id, notification)
  }
}

/**
 * Notify all admins + managers.
 */
async function notifyManagement(notification) {
  const { data: members } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)
  for (const m of members || []) {
    await createNotification(m.id, notification)
  }
}

/**
 * Notify a specific team member.
 */
async function notifyUser(userId, notification) {
  return createNotification(userId, notification)
}

/**
 * Log workflow event to workflow_logs table.
 */
async function logWorkflow(jobName, { status, details = null, error = null }) {
  await supabase.from('workflow_logs').insert({
    job_name: jobName,
    status,
    details,
    error_message: error,
  })
}

module.exports = { createNotification, notifyAllAdmins, notifyManagement, notifyUser, logWorkflow }
