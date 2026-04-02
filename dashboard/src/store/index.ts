import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DateRangePreset = '24h' | '7d' | '30d' | '90d' | 'custom'

interface AppStore {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  dateRange: DateRangePreset
  customDateFrom: Date | null
  customDateTo: Date | null
  setDateRange: (range: DateRangePreset, from?: Date | null, to?: Date | null) => void

  activeCloud: string | null
  setActiveCloud: (cloudId: string | null) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
        }
        set({ theme })
      },

      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      dateRange: '30d',
      customDateFrom: null,
      customDateTo: null,
      setDateRange: (dateRange, from, to) =>
        set((state) => ({
          dateRange,
          customDateFrom: from !== undefined ? from : state.customDateFrom,
          customDateTo: to !== undefined ? to : state.customDateTo,
        })),

      activeCloud: null,
      setActiveCloud: (activeCloud) => set({ activeCloud }),
    }),
    {
      name: 'opencnapp-ui',
      partialize: (state) => ({
        theme: state.theme,
        dateRange: state.dateRange,
      }),
    }
  )
)
