import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUi } from '@/context/UiContext'
import { useEndpoint } from '@/hooks/useResource'

export default function Topbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, lang, toggleTheme, toggleLang } = useUi()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')

  const { data: alerts } = useEndpoint('/alerts/summary/', {}, { refetchInterval: 60000 })

  const submit = (event) => {
    event.preventDefault()
    if (term.trim().length >= 2) navigate(`/recherche?q=${encodeURIComponent(term.trim())}`)
  }

  const initials = (user?.full_name || user?.username || '?')
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b-[3px]
                       border-brass-500 bg-sidebar px-6 py-3 text-[#F2F6FB]">
      <span className="font-arabic text-xl font-bold lg:hidden">شـامل</span>

      <form onSubmit={submit} className="relative max-w-md flex-1">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#8393A9]" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          className="w-full rounded-pill border border-white/25 bg-white/10 ps-9 pe-4 py-1.5
                     text-sm text-white placeholder:text-[#8393A9] focus:outline-none
                     focus:ring-2 focus:ring-white/40"
        />
      </form>

      <div className="ms-auto flex items-center gap-2">
        <Link to="/alertes" className="relative rounded-pill p-2 hover:bg-white/10" aria-label={t('nav.alerts')}>
          <Bell size={18} />
          {alerts?.unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center
                             justify-center rounded-full bg-late px-1 text-[0.6rem] font-bold">
              {alerts.unread}
            </span>
          )}
        </Link>

        <button onClick={toggleLang} aria-pressed={lang === 'ar'}
                className="rounded-pill border border-white/25 bg-white/10 px-3.5 py-1.5
                           text-[0.8125rem] font-semibold hover:bg-white/20">
          {lang === 'fr' ? 'AR' : 'FR'}
        </button>

        <button onClick={toggleTheme} aria-pressed={theme === 'dark'}
                aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                className="rounded-pill border border-white/25 bg-white/10 p-2 hover:bg-white/20">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <Link to="/profil" className="flex items-center gap-2 rounded-pill px-2 py-1 hover:bg-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-full
                           border-2 border-brass-500 bg-primary-600 text-xs font-bold">
            {initials}
          </span>
          <span className="hidden text-sm sm:block">{user?.full_name || user?.username}</span>
        </Link>

        <button onClick={logout} aria-label={t('nav.logout')}
                className="rounded-pill p-2 hover:bg-white/10">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
