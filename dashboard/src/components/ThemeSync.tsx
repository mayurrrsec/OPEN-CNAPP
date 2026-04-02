import { useEffect } from 'react'
import { useAppStore } from '@/store'

/** Keeps <html data-theme> in sync with persisted Zustand theme. */
export function ThemeSync() {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
  }, [theme])

  return null
}
