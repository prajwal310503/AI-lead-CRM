import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      sidebarCollapsed: false,

      // AI settings (cached locally, saved to Supabase)
      activeProvider: 'claude',
      activeModel: 'claude-sonnet-4-6',
      apiKeys: { claude: '', openai: '', gemini: '', openrouter: '' },

      // Company settings
      companyName: 'StartWeb',
      companyEmail: '',
      companyPhone: '',
      companyWebsite: 'https://startweb.cloud',
      companyCity: 'Panvel, Navi Mumbai',
      companyAddress: '',
      companyLogoUrl: '',
      gstNumber: '',
      upiId: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountName: '',
      invoicePrefix: 'SW',
      defaultTax: 18,
      defaultCurrency: 'INR',
      paymentTerms: '50% advance, 50% on completion',

      // SMTP
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      smtpFromName: 'StartWeb',

      // WhatsApp
      whatsappEnabled: false,
      waProvider: 'meta',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioFrom: '',
      aiSensyApiKey: '',
      aiSensySenderId: '',
      metaPhoneId: '',
      metaAccessToken: '',
      metaVerifyToken: '',
      waAutoIntro: false,
      waFollowupEnabled: true,

      // Scraper
      serpapiKey: '',
      apifyToken: '',
      googlePlacesKey: '',
      defaultLocation: 'Navi Mumbai, Maharashtra',
      maxLeads: 20,

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
        document.body.className = theme
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),

      setProvider: (provider, model) =>
        set({ activeProvider: provider, activeModel: model }),

      loadFromSupabase: async (userId) => {
        const { data } = await supabase
          .from('app_settings')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (data) {
          set({
            activeProvider: data.active_provider || 'claude',
            activeModel: data.active_model || 'claude-sonnet-4-6',
            apiKeys: data.api_keys || { claude: '', openai: '', gemini: '', openrouter: '' },
            companyName: data.company_name || 'StartWeb',
            companyEmail: data.company_email || '',
            companyPhone: data.company_phone || '',
            companyWebsite: data.company_website || '',
            companyCity: data.company_city || '',
            companyAddress: data.company_address || '',
            companyLogoUrl: data.company_logo_url || '',
            gstNumber: data.gst_number || '',
            upiId: data.upi_id || '',
            bankName: data.bank_name || '',
            accountNumber: data.account_number || '',
            ifscCode: data.ifsc_code || '',
            accountName: data.account_name || '',
            invoicePrefix: data.invoice_prefix || 'SW',
            defaultTax: Number(data.default_tax) || 18,
            smtpHost: data.smtp_host || 'smtp.gmail.com',
            smtpPort: Number(data.smtp_port) || 587,
            smtpUser: data.smtp_user || '',
            smtpPass: data.smtp_pass || '',
            whatsappEnabled: data.whatsapp_enabled || false,
            waProvider: data.wa_provider || 'twilio',
            twilioAccountSid: data.twilio_account_sid || '',
            twilioAuthToken: data.twilio_auth_token || '',
            twilioFrom: data.twilio_from || '',
            aiSensyApiKey: data.aisensy_api_key || '',
            aiSensySenderId: data.aisensy_sender_id || '',
            metaPhoneId: data.meta_phone_id || '',
            metaAccessToken: data.meta_access_token || '',
            metaVerifyToken: data.meta_verify_token || '',
            waAutoIntro: data.wa_auto_intro || false,
            waFollowupEnabled: data.wa_followup_enabled !== false,
            serpapiKey: data.serpapi_key || data.api_keys?.serpapi_key || data.api_keys?.serpapiKey || '',
            apifyToken: data.apify_token || data.api_keys?.apify_token || data.api_keys?.apifyToken || '',
            googlePlacesKey: data.api_keys?.google_places || data.api_keys?.googlePlaces || '',
            defaultLocation: data.default_location || 'Navi Mumbai, Maharashtra',
            maxLeads: Number(data.max_leads) || 20,
          })
        }
      },

      getAISettings: () => {
        const s = get()
        return { activeProvider: s.activeProvider, activeModel: s.activeModel, apiKeys: s.apiKeys }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (s) => ({
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        activeProvider: s.activeProvider,
        activeModel: s.activeModel,
        apiKeys: s.apiKeys,
      }),
    }
  )
)

export default useSettingsStore
