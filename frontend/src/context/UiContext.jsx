import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const UiContext = createContext(null)

export function UiProvider({ children }) {
  const { i18n } = useTranslation()
  const [theme, setTheme] = useState(() => localStorage.getItem('chamil_theme') || 'light')
  const [lang, setLang] = useState(() => localStorage.getItem('chamil_lang') || 'fr')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('chamil_theme', theme)
  }, [theme])

  useEffect(() => {
    // La direction bascule avec la langue : RTL natif, propriétés logiques uniquement.
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('chamil_lang', lang)
    i18n.changeLanguage(lang)
  }, [lang, i18n])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const toggleLang = useCallback(() => setLang((l) => (l === 'ar' ? 'fr' : 'ar')), [])

  const value = useMemo(
    () => ({ theme, lang, toggleTheme, toggleLang, setLang, setTheme,
             sidebarOpen, setSidebarOpen, isRtl: lang === 'ar' }),
    [theme, lang, toggleTheme, toggleLang, sidebarOpen],
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export const useUi = () => {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi doit être utilisé dans UiProvider')
  return ctx
}
