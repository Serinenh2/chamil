import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { rest } from '@/services/api'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { useAuth } from '@/context/AuthContext'
import { Alert, Button, Card, Field, Input, KeyValue, Select, Spinner, Tabs } from '@/components/ui'
import CompanyTab from './CompanyTab'
import SecurityTab from './SecurityTab'
import ActivityLogTab from './ActivityLogTab'

const POSITIONS = [
  ['owner', 'Propriétaire'], ['manager', 'Gérant'], ['ceo', 'PDG'],
  ['partner', 'Associé'], ['dg', 'Directeur général'],
]

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

/**
 * Page profil — section 39 du cahier des charges.
 * Les données personnelles du dirigeant sont strictement privées : l'API les
 * refuse aux rôles autres que propriétaire et administrateur.
 */
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, setUser, isOwner } = useAuth()
  const { date, number } = useFormat()
  const qc = useQueryClient()
  const [tab, setTab] = useState('personal')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  const { data: profile, isLoading, error } = useEndpoint('/profile/owner/me/', {},
                                                          { retry: false, enabled: isOwner })

  const saveProfile = useMutation({
    mutationFn: (payload) => rest.patch('/profile/owner/me/', payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['/profile/owner/me/'] })
      setUser({
        ...user,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
      })
      setEditing(false)
    },
  })

  const startEdit = () => {
    setForm({
      last_name: profile.last_name || '', first_name: profile.first_name || '',
      last_name_ar: profile.last_name_ar || '', first_name_ar: profile.first_name_ar || '',
      birth_date: profile.birth_date || '', birth_place: profile.birth_place || '',
      nin: profile.nin || '', position: profile.position || 'owner',
      appointed_on: profile.appointed_on || '', capital_share: profile.capital_share ?? 0,
      mobile: profile.mobile || '', personal_email: profile.personal_email || '',
    })
    setEditing(true)
  }

  const initials = (user?.full_name || user?.username || '?')
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const tabs = [
    { key: 'personal', label: t('profile.personal') },
    { key: 'company', label: t('profile.company') },
    { key: 'settings', label: t('profile.settings') },
    { key: 'security', label: t('profile.security') },
    ...(isOwner ? [{ key: 'log', label: t('profile.log') }] : []),
  ]

  return (
    <>
      {/* En-tête de profil */}
      <header className="flex flex-wrap items-center gap-5 rounded-lg border-b-[3px]
                         border-brass-500 bg-sidebar px-6 py-5 text-[#F2F6FB]">
        <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center
                         rounded-full border-[3px] border-brass-500 bg-primary-600
                         text-[1.9rem] font-bold">
          {initials}
        </span>
        <div>
          <b className="block text-card">
            {profile ? `${profile.full_name}${profile.full_name_ar ? ` — ${profile.full_name_ar}` : ''}`
                     : user?.full_name || user?.username}
          </b>
          <span className="text-[0.82rem] font-semibold uppercase tracking-wider text-brass-300">
            {profile?.position_label || user?.role_label}
          </span>
          <p className="mt-1.5 text-[0.8rem] text-[#B9C7DB]">
            {profile?.company_name}
            {user?.last_login && <> · <span className="data">{date(user.last_login)}</span></>}
          </p>
        </div>
      </header>

      <div className="mt-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'personal' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t('profile.identity')}
                action={isOwner && profile && !editing && (
                  <Button size="sm" variant="secondary" onClick={startEdit}>{t('common.edit')}</Button>
                )}>
            {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
            {error && (
              <Alert tone="warn" title={t('profile.privateTitle')}>
                {t('profile.privateText')}
              </Alert>
            )}
            {saveProfile.isError && (
              <Alert tone="error">{errorText(saveProfile.error, t('common.error'))}</Alert>
            )}

            {profile && editing && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('profile.lastName')} required>
                    <Input value={form.last_name}
                           onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </Field>
                  <Field label={t('profile.firstName')} required>
                    <Input value={form.first_name}
                           onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </Field>
                  <Field label={t('profile.lastNameAr')}>
                    <Input dir="rtl" value={form.last_name_ar}
                           onChange={(e) => setForm({ ...form, last_name_ar: e.target.value })} />
                  </Field>
                  <Field label={t('profile.firstNameAr')}>
                    <Input dir="rtl" value={form.first_name_ar}
                           onChange={(e) => setForm({ ...form, first_name_ar: e.target.value })} />
                  </Field>
                  <Field label={t('profile.birthDate')}>
                    <Input type="date" value={form.birth_date || ''}
                           onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                  </Field>
                  <Field label={t('profile.birthPlace')}>
                    <Input value={form.birth_place}
                           onChange={(e) => setForm({ ...form, birth_place: e.target.value })} />
                  </Field>
                  <Field label={t('profile.nin')}>
                    <Input value={form.nin}
                           onChange={(e) => setForm({ ...form, nin: e.target.value })} />
                  </Field>
                  <Field label={t('profile.position')}>
                    <Select value={form.position}
                            onChange={(e) => setForm({ ...form, position: e.target.value })}>
                      {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('profile.appointedOn')}>
                    <Input type="date" value={form.appointed_on || ''}
                           onChange={(e) => setForm({ ...form, appointed_on: e.target.value })} />
                  </Field>
                  <Field label={t('profile.capitalShare')}>
                    <Input type="number" step="0.01" value={form.capital_share}
                           onChange={(e) => setForm({ ...form, capital_share: e.target.value })} />
                  </Field>
                  <Field label={t('profile.mobile')}>
                    <Input value={form.mobile}
                           onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  </Field>
                  <Field label={t('profile.personalEmail')}>
                    <Input type="email" value={form.personal_email}
                           onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" disabled={saveProfile.isPending}
                          onClick={() => saveProfile.mutate(form)}>
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </>
            )}

            {profile && !editing && (
              <dl className="grid gap-4 sm:grid-cols-2">
                <KeyValue label={t('profile.lastName')} value={profile.last_name} />
                <KeyValue label={t('profile.firstName')} value={profile.first_name} />
                <KeyValue label={t('profile.lastNameAr')} value={profile.last_name_ar} />
                <KeyValue label={t('profile.firstNameAr')} value={profile.first_name_ar} />
                <KeyValue label={t('profile.birthDate')} value={date(profile.birth_date)} mono />
                <KeyValue label={t('profile.birthPlace')} value={profile.birth_place} />
                <KeyValue label={t('profile.nin')}
                          value={profile.nin ? `•••• •••• •••• ${String(profile.nin).slice(-4)}` : '—'}
                          mono />
                <KeyValue label={t('profile.position')} value={profile.position_label} />
                <KeyValue label={t('profile.appointedOn')} value={date(profile.appointed_on)} mono />
                <KeyValue label={t('profile.capitalShare')}
                          value={`${number(profile.capital_share)} %`} mono />
                <KeyValue label={t('profile.mobile')} value={profile.mobile} mono />
                <KeyValue label={t('profile.personalEmail')} value={profile.personal_email} mono />
              </dl>
            )}

            <div className="mt-5 flex gap-3 rounded-md border border-primary-600/30
                            bg-primary-50 p-3.5 text-[0.8125rem]">
              <Lock size={18} className="mt-0.5 shrink-0" />
              <div>
                <b className="block">{t('profile.privateTitle')}</b>
                {t('profile.privateText')}
              </div>
            </div>
          </Card>

          <CompanyTab compact />
        </div>
      )}

      {tab === 'company' && <CompanyTab />}
      {tab === 'settings' && <CompanyTab settingsOnly />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'log' && <ActivityLogTab />}
    </>
  )
}
