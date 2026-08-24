import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { useUi } from '@/context/UiContext'
import { Button, Field, Input } from '@/components/ui'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { lang, toggleLang, theme, toggleTheme } = useUi()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch {
      setError(t('auth.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-center bg-sidebar px-16 text-[#F2F6FB] lg:flex">
        <span className="font-arabic text-[3.5rem] font-bold leading-none">شـامل</span>
        <span className="mt-2 text-sm font-semibold uppercase tracking-[0.4em] text-brass-300">
          Chamil
        </span>
        <p className="mt-6 max-w-sm text-sm text-[#B9C7DB]">{t('app.tagline')}</p>
        <p className="mt-10 font-mono text-xs text-[#5F7396]">
          FOURNISSEUR → ACHAT → STOCK → VENTE → CLIENT → FACTURE → PAIEMENT
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex justify-end gap-2">
            <button type="button" onClick={toggleLang}
                    className="rounded-pill border border-line-strong px-3 py-1 text-xs font-semibold">
              {lang === 'fr' ? 'AR' : 'FR'}
            </button>
            <button type="button" onClick={toggleTheme}
                    className="rounded-pill border border-line-strong px-3 py-1 text-xs font-semibold">
              {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            </button>
          </div>

          <h1 className="text-page">{t('auth.title')}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{t('auth.subtitle')}</p>

          <Field label={t('auth.username')} required>
            <Input
              autoFocus
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>

          <Field label={t('auth.password')} required error={error}>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full justify-center" disabled={busy}>
            {busy ? t('common.loading') : t('auth.submit')}
          </Button>
        </form>
      </main>
    </div>
  )
}
