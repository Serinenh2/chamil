import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { rest } from '@/services/api'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { useAuth } from '@/context/AuthContext'
import { Alert, Button, Card, DataTable, Field, Input, Switch } from '@/components/ui'

/** Onglet Sécurité — section 39.5. */
export default function SecurityTab() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const { dateTime } = useFormat()
  const [form, setForm] = useState({ current_password: '', new_password: '' })
  const [feedback, setFeedback] = useState(null)

  const { data: logins, isLoading } = useEndpoint('/profile/owner/logins/')

  const changePassword = useMutation({
    mutationFn: (payload) => rest.action('/users/change-password/', payload),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: t('common.save') })
      setForm({ current_password: '', new_password: '' })
    },
    onError: (error) => setFeedback({
      tone: 'error',
      message: Object.values(error.response?.data || {}).flat().join(' ') || t('common.error'),
    }),
  })

  const togglePreference = useMutation({
    mutationFn: (payload) => rest.action('/users/me/', payload),
  })

  const toggle2fa = () => {
    const next = !user.two_factor_enabled
    setUser({ ...user, two_factor_enabled: next })
    togglePreference.mutate({ two_factor_enabled: next })
  }

  const columns = [
    { key: 'created_at', label: t('table.date'), align: 'num',
      render: (r) => dateTime(r.created_at) },
    { key: 'ip_address', label: 'IP', render: (r) => <span className="data">{r.ip_address || '—'}</span> },
    { key: 'device', label: t('profile.device'),
      render: (r) => <span className="truncate text-xs">{r.device || '—'}</span> },
    { key: 'successful', label: t('table.status'),
      render: (r) => (r.successful ? '✓' : '✕') },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('profile.security')}>
        {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

        <Switch checked={!!user?.two_factor_enabled} onChange={toggle2fa}
                label={t('profile.twoFactor')} />
        <Switch checked={!!user?.notify_by_email}
                onChange={() => {
                  const next = !user.notify_by_email
                  setUser({ ...user, notify_by_email: next })
                  togglePreference.mutate({ notify_by_email: next })
                }}
                label={t('profile.loginAlert')} />

        <hr className="my-5 border-line" />

        <Field label={t('auth.password')}>
          <Input type="password" autoComplete="current-password"
                 value={form.current_password}
                 onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        </Field>
        <Field label={t('profile.changePassword')} help="10 caractères minimum.">
          <Input type="password" autoComplete="new-password"
                 value={form.new_password}
                 onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
        </Field>
        <Button disabled={changePassword.isPending || !form.new_password}
                onClick={() => changePassword.mutate(form)}>
          {t('common.save')}
        </Button>
      </Card>

      <div>
        <h3 className="mb-3 text-base font-semibold">{t('profile.logins')}</h3>
        <DataTable columns={columns} rows={logins} loading={isLoading} />
      </div>
    </div>
  )
}
