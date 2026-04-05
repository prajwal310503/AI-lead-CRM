import WAChatPanel from '../../whatsapp/components/WAChatPanel'

// Thin wrapper — renders the shared WAChatPanel inside the Lead Detail Panel
export default function WhatsAppConversation({ lead }) {
  return <WAChatPanel lead={lead} compact />
}
