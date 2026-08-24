import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { useAuth } from '@/context/AuthContext'
import { Alert, Card, KeyValue, Spinner, Tabs } from '@/components/ui'
import CompanyTab from './CompanyTab'
import SecurityTab from './SecurityTab'
import ActivityLogTab from './ActivityLogTab'

/**
 * Page profil — section 39 du cahier des charges.
 * Les données personnelles du dirigeant sont strictement privées : l'API les
 * refuse aux rôles autres que propriétaire et administrateur.
 */
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, isOwner } = useAuth()
  const { date, number } = useFormat()
  const [tab, setTab] = useState('personal')

  const { data: profile, isLoading, error } = useEndpoint('/profile/owner/me/', {},
                                                          { retry: false, enabled: isOwner })

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
          <Card title={t('profile.identity')}>
            {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
            {error && (
              <Alert tone="warn" title={t('profile.privateTitle')}>
                {t('profile.privateText')}
              </Alert>
            )}
            {profile && (
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
