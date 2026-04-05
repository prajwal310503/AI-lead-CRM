const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

function getTransporter(settings) {
  return nodemailer.createTransport({
    host: settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(settings.smtpPort || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: settings.smtpUser || process.env.SMTP_USER,
      pass: settings.smtpPass || process.env.SMTP_PASS,
    },
  })
}

function loadTemplate(name) {
  try {
    return fs.readFileSync(path.join(__dirname, '../templates/emails', `${name}.html`), 'utf8')
  } catch {
    return null
  }
}

function fillTemplate(template, vars) {
  if (!template) return ''
  return Object.entries(vars).reduce((t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v || ''), template)
}

async function sendProposalEmail({ to, name, proposalTitle, total, pdfUrl, settings }) {
  const transporter = getTransporter(settings || {})
  const template = loadTemplate('proposal')
  const html = fillTemplate(template, { name, proposalTitle, total, pdfUrl, company: 'StartWeb' }) ||
    `<p>Hi ${name},</p><p>Your proposal <b>${proposalTitle}</b> for ${total} is ready. <a href="${pdfUrl}">View Proposal</a></p>`
  await transporter.sendMail({
    from: `"${settings?.smtpFromName || 'StartWeb'}" <${settings?.smtpUser || process.env.SMTP_USER}>`,
    to, subject: `Proposal: ${proposalTitle} — StartWeb`,
    html,
    attachments: pdfUrl ? [{ filename: 'proposal.pdf', path: pdfUrl }] : [],
  })
}

async function sendInvoiceEmail({ to, name, invoiceNumber, amount, dueDate, pdfUrl, qrUrl, settings }) {
  const transporter = getTransporter(settings || {})
  const template = loadTemplate('invoice')
  const html = fillTemplate(template, { name, invoiceNumber, amount, dueDate, pdfUrl, qrUrl, company: 'StartWeb' }) ||
    `<p>Hi ${name},</p><p>Invoice <b>${invoiceNumber}</b> for <b>${amount}</b> is ready. Due: ${dueDate}. <a href="${pdfUrl}">View Invoice</a></p>`
  await transporter.sendMail({
    from: `"${settings?.smtpFromName || 'StartWeb'}" <${settings?.smtpUser || process.env.SMTP_USER}>`,
    to, subject: `Invoice ${invoiceNumber} — StartWeb`,
    html,
  })
}

async function sendPaymentReceiptEmail({ to, name, invoiceNumber, amount, settings }) {
  const transporter = getTransporter(settings || {})
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:white;margin:0">Payment Received!</h2></div><div style="padding:20px;background:#f9f9f9"><p>Hi ${name},</p><p>We've received your payment of <strong>${amount}</strong> for invoice <strong>${invoiceNumber}</strong>. Thank you!</p><p>Best regards,<br>StartWeb Team</p></div></div>`
  await transporter.sendMail({
    from: `"StartWeb" <${settings?.smtpUser || process.env.SMTP_USER}>`,
    to, subject: `Payment Received — Invoice ${invoiceNumber}`,
    html,
  })
}

async function sendTaskReminderEmail({ to, name, tasks, settings }) {
  const transporter = getTransporter(settings || {})
  const taskRows = tasks.map((t) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${t.title}</td><td style="padding:8px;border-bottom:1px solid #eee;color:${t.priority === 'urgent' ? 'red' : 'orange'}">${t.priority}</td><td style="padding:8px;border-bottom:1px solid #eee">${t.deadline || '—'}</td></tr>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#6366F1;padding:20px"><h2 style="color:white;margin:0">Daily Task Reminder</h2></div><div style="padding:20px"><p>Hi ${name}, you have ${tasks.length} pending tasks:</p><table style="width:100%;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Task</th><th style="padding:8px;text-align:left">Priority</th><th style="padding:8px;text-align:left">Deadline</th></tr>${taskRows}</table></div></div>`
  await transporter.sendMail({
    from: `"StartWeb" <${settings?.smtpUser || process.env.SMTP_USER}>`,
    to, subject: `${tasks.length} Tasks Due — StartWeb Daily Reminder`,
    html,
  })
}

async function sendTeamInviteEmail({ to, name, role, token, frontendUrl, settings }) {
  const transporter = getTransporter(settings || {})
  const acceptUrl = `${frontendUrl || process.env.FRONTEND_URL}/accept-invite?token=${token}`
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#FF6B35,#0EA5E9);padding:24px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">You're invited to join StartWebOS!</h2></div><div style="padding:24px;background:#f9f9f9"><p>Hi ${name},</p><p>You've been invited to join <strong>StartWebOS</strong> as a <strong>${role}</strong>.</p><p>Click below to accept your invitation and set your password:</p><a href="${acceptUrl}" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Accept Invitation</a><p style="color:#999;font-size:12px">This link expires in 7 days. If you didn't expect this, ignore this email.</p></div></div>`
  await transporter.sendMail({
    from: `"StartWeb" <${settings?.smtpUser || process.env.SMTP_USER}>`,
    to, subject: 'You\'re invited to StartWebOS',
    html,
  })
}

module.exports = { sendProposalEmail, sendInvoiceEmail, sendPaymentReceiptEmail, sendTaskReminderEmail, sendTeamInviteEmail }
