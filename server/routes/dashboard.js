const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/stats', async (req, res) => {
  const [leadsRes, projectsRes, invoicesRes, tasksRes] = await Promise.all([
    supabase.from('leads').select('status, health_score, is_analysed'),
    supabase.from('projects').select('status'),
    supabase.from('invoices').select('status, total, amount_due, amount_paid'),
    supabase.from('tasks').select('status, deadline, assigned_to'),
  ])

  const leads = leadsRes.data || []
  const projects = projectsRes.data || []
  const invoices = invoicesRes.data || []
  const tasks = tasksRes.data || []

  const today = new Date().toISOString().split('T')[0]

  res.json({
    totalLeads: leads.length,
    hotLeads: leads.filter((l) => l.status === 'hot').length,
    convertedLeads: leads.filter((l) => l.status === 'converted').length,
    monthlyRevenue: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    totalBilled: invoices.reduce((s, i) => s + (i.total || 0), 0),
    totalDue: invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount_due || 0), 0),
    activeProjects: projects.filter((p) => p.status === 'active').length,
    tasksDue: tasks.filter((t) => t.deadline && t.deadline <= today && t.status !== 'done').length,
    pendingInvoices: invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length,
    pipeline: ['cold','contacted','warm','hot','proposal_sent','negotiation','converted','lost'].map((stage) => ({
      stage, count: leads.filter((l) => l.status === stage).length,
    })),
  })
})

module.exports = router
