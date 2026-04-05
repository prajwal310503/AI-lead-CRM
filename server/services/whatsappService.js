const axios = require('axios')

function cleanPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('91') ? digits : `91${digits}`
}

async function sendWhatsApp(phone, message, settings) {
  const provider = settings?.wa_provider || 'twilio'
  const recipient = cleanPhone(phone)

  if (provider === 'meta') {
    const phoneId = settings?.meta_phone_id
    const token   = settings?.meta_access_token
    if (!phoneId || !token) {
      console.log('[WA] Meta Cloud API not configured — missing Phone ID or Access Token')
      return { skipped: true, reason: 'Meta Phone Number ID and Access Token are required. Configure in Settings → WhatsApp.' }
    }
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to:   recipient,
        type: 'text',
        text: { preview_url: false, body: message },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    console.log('[WA] Meta response:', JSON.stringify(response.data))
    return response.data
  }

  if (provider === 'aisensy') {
    const apiKey       = settings?.aisensy_api_key
    const campaignName = settings?.aisensy_sender_id
    if (!apiKey || !campaignName) {
      console.log('[WA] AiSensy not configured — missing API key or Campaign Name')
      return { skipped: true, reason: 'AiSensy API Key and Campaign Name are required. Configure in Settings → WhatsApp.' }
    }
    // Campaign API works for all contacts (new + existing), no 24h session restriction
    const response = await axios.post(
      'https://backend.aisensy.com/campaign/t1/api/v2',
      {
        apiKey,
        campaignName,
        destination:    recipient,
        userName:       'StartWebOS',
        templateParams: [message],
        source:         'StartWebOS',
        media:          {},
        buttons:        [],
        carouselCards:  [],
        location:       {},
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    console.log('[WA] AiSensy response:', JSON.stringify(response.data))
    return response.data
  }

  // Default: Twilio
  const sid   = settings?.twilio_account_sid
  const token = settings?.twilio_auth_token
  const from  = settings?.twilio_from
  if (!sid || !token || !from) {
    console.log('[WA] Twilio not configured — missing SID, Auth Token or From number')
    return { skipped: true, reason: 'Twilio Account SID, Auth Token and From Number are required. Configure in Settings → WhatsApp.' }
  }
  const to = `+${recipient}`
  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: message }),
    { auth: { username: sid, password: token }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return response.data
}

// Send a media message (image / video / document)
async function sendWhatsAppMedia(phone, mediaType, mediaUrl, caption, settings) {
  const provider  = settings?.wa_provider || 'twilio'
  const recipient = cleanPhone(phone)

  if (provider === 'meta') {
    const phoneId = settings?.meta_phone_id
    const token   = settings?.meta_access_token
    if (!phoneId || !token) { return { skipped: true, reason: 'Meta Phone ID and Access Token required.' } }
    const typeMap = { image: 'image', video: 'video', document: 'document', audio: 'audio' }
    const mType   = typeMap[mediaType] || 'document'
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to:     recipient,
        type:   mType,
        [mType]: { link: mediaUrl, caption: caption || '' },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    return response.data
  }

  if (provider === 'aisensy') {
    const apiKey = settings?.aisensy_api_key
    if (!apiKey) { console.log('[WA] AiSensy not configured, skipping media'); return { skipped: true, reason: 'AiSensy API Key required.' } }
    // Map mediaType to AiSensy type
    const typeMap = { image: 'image', video: 'video', document: 'document' }
    const aType   = typeMap[mediaType] || 'document'
    const response = await axios.post(
      'https://backend.aisensy.com/direct-apis/t1/messages',
      {
        apiKey,
        to:             recipient,
        type:           aType,
        recipient_type: 'individual',
        [aType]:        { link: mediaUrl, caption: caption || '' },
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    return response.data
  }

  // Default: Twilio
  const sid   = settings?.twilio_account_sid
  const token = settings?.twilio_auth_token
  const from  = settings?.twilio_from
  if (!sid || !token || !from) { console.log('[WA] Twilio not configured, skipping media'); return { skipped: true } }
  const to = `+${recipient}`
  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: caption || '', MediaUrl: mediaUrl }),
    { auth: { username: sid, password: token }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return response.data
}

const templates = {
  proposalSent: (name, title, link) =>
    `Hi ${name}! Your proposal from StartWeb is ready!\n\n📄 *${title}*\n\nView your proposal: ${link}\n\nFeel free to reach out if you have any questions!`,

  proposalAccepted: (name) =>
    `Hi ${name}! Great news — your project with StartWeb is officially getting started! 🚀\n\nOur team will be in touch shortly to begin the onboarding process.`,

  invoiceSent: (name, number, amount, due, link) =>
    `Hi ${name}!\n\nInvoice ${number} for *${amount}* has been sent.\n\n📅 Due: ${due}\n\n💳 Pay here: ${link || 'Check your email for payment instructions'}\n\nThank you for your business! 🙏`,

  paymentReceived: (name, amount, invoice) =>
    `Hi ${name}! ✅\n\nWe've received your payment of *${amount}* for invoice ${invoice}.\n\nThank you! Your receipt has been sent to your email.`,

  taskReminder: (name, count, date) =>
    `Hi ${name}! 👋\n\nYou have *${count} pending tasks* for today (${date}).\n\nCheck StartWebOS to stay on track! 💪`,

  leadHook: (message) => message,

  reportReady: (name, link) =>
    `Hi ${name}! 📊\n\nYour *Business Analysis Report* from StartWeb is ready!\n\nView report: ${link}\n\nWe've identified key opportunities to grow your business online.`,

  followUp: (name, businessName) =>
    `Hi ${name}! 👋\n\nThis is Deepak from StartWeb. Just checking in on *${businessName}*.\n\nDid you get a chance to review our proposal? Happy to answer any questions or schedule a call! 😊`,

  projectStarted: (name, projectName) =>
    `Hi ${name}! 🎉\n\nGreat news! Your project *${projectName}* has officially started!\n\nYou can track progress on your client portal. We'll keep you updated every step of the way!`,

  invoiceOverdue: (name, amount, days) =>
    `Hi ${name},\n\nThis is a gentle reminder that your payment of *${amount}* is ${days} days overdue.\n\nPlease clear the payment at your earliest convenience. Contact us if you need any assistance. 🙏`,
}

async function sendProposalSent({ phone, name, title, link, settings }) {
  return sendWhatsApp(phone, templates.proposalSent(name, title, link), settings)
}

async function sendProposalAccepted({ phone, name, settings }) {
  return sendWhatsApp(phone, templates.proposalAccepted(name), settings)
}

async function sendInvoiceSent({ phone, name, number, amount, due, link, settings }) {
  return sendWhatsApp(phone, templates.invoiceSent(name, number, amount, due, link), settings)
}

async function sendPaymentReceived({ phone, name, amount, invoice, settings }) {
  return sendWhatsApp(phone, templates.paymentReceived(name, amount, invoice), settings)
}

async function sendTaskReminder({ phone, name, count, date, settings }) {
  return sendWhatsApp(phone, templates.taskReminder(name, count, date), settings)
}

async function sendLeadHook({ phone, message, settings }) {
  return sendWhatsApp(phone, templates.leadHook(message), settings)
}

async function sendReportReady({ phone, name, link, settings }) {
  return sendWhatsApp(phone, templates.reportReady(name, link), settings)
}

async function sendFollowUp({ phone, name, businessName, settings }) {
  return sendWhatsApp(phone, templates.followUp(name, businessName), settings)
}

async function sendProjectStarted({ phone, name, projectName, settings }) {
  return sendWhatsApp(phone, templates.projectStarted(name, projectName), settings)
}

async function sendInvoiceOverdue({ phone, name, amount, days, settings }) {
  return sendWhatsApp(phone, templates.invoiceOverdue(name, amount, days), settings)
}

module.exports = {
  sendWhatsApp, sendWhatsAppMedia,
  sendProposalSent, sendProposalAccepted, sendInvoiceSent,
  sendPaymentReceived, sendTaskReminder, sendLeadHook, sendReportReady,
  sendFollowUp, sendProjectStarted, sendInvoiceOverdue,
}
