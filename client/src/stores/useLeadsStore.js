import { create } from 'zustand'

const useLeadsStore = create((set, get) => ({
  leads: [],
  selectedLead: null,
  detailPanelOpen: false,
  activeView: 'kanban', // 'kanban' | 'discovery'
  filters: { stage: 'all', search: '', priority: false },

  setLeads: (leads) => set({ leads }),

  upsertLead: (lead) =>
    set((s) => {
      const idx = s.leads.findIndex((l) => l.id === lead.id)
      if (idx >= 0) {
        const updated = [...s.leads]
        updated[idx] = lead
        return { leads: updated }
      }
      return { leads: [lead, ...s.leads] }
    }),

  removeLead: (id) =>
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

  openDetail: (lead) => set({ selectedLead: lead, detailPanelOpen: true }),
  closeDetail: () => set({ detailPanelOpen: false }),

  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  getLeadsByStage: (stage) => get().leads.filter((l) => l.status === stage),

  moveLeadStage: (leadId, newStage) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId ? { ...l, status: newStage } : l
      ),
    })),
}))

export default useLeadsStore
