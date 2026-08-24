import { useTranslation } from 'react-i18next'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Card, KeyValue, Spinner } from '@/components/ui'

/** Identité légale de l'entreprise et paramètres commerciaux (sections 39.2 et 39.3). */
export default function CompanyTab({ compact = false, settingsOnly = false }) {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { data: company, isLoading } = useEndpoint('/profile/company/current/')
  const { data: settings } = useEndpoint('/profile/settings/current/')

  if (isLoading) return <Card><div className="flex justify-center py-6"><Spinner /></div></Card>

  const identity = (
    <Card title={t('profile.company')}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <KeyValue label={t('profile.companyName')} value={company?.name} />
        <KeyValue label="التسمية" value={company?.name_ar} />
        <KeyValue label={t('profile.legalForm')} value={company?.legal_form_label} />
        <KeyValue label={t('profile.capital')} value={money(company?.capital)} mono />
        <KeyValue label="RC" value={company?.rc} mono />
        <KeyValue label="NIF" value={company?.nif} mono />
        <KeyValue label="NIS" value={company?.nis} mono />
        <KeyValue label={t('table.wilaya')} value={company?.wilaya_label} />
        {!compact && <>
          <KeyValue label={t('table.phone')} value={company?.phone} mono />
          <KeyValue label="Email" value={company?.email} mono />
          <KeyValue label="RIB" value={company?.rib} mono />
          <KeyValue label="Date de création" value={date(company?.founded_on)} mono />
        </>}
      </dl>
    </Card>
  )

  const commercial = (
    <Card title={t('profile.settings')} className={compact ? 'mt-4' : ''}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <KeyValue label={t('profile.vat')} value={`${settings?.default_vat_rate ?? '—'} %`} mono />
        <KeyValue label={t('profile.currency')} value={settings?.currency} mono />
        <KeyValue label={t('profile.paymentTerm')} value={settings?.default_payment_term} mono />
        <KeyValue label={t('profile.creditLimit')} value={money(settings?.default_credit_limit)} mono />
        <KeyValue label={t('profile.numbering')}
                  value={`${settings?.prefix_invoice ?? 'FA'}-${new Date().getFullYear()}-0000`} mono />
        <KeyValue label={t('profile.docLang')} value={settings?.document_language} />
      </dl>
    </Card>
  )

  if (settingsOnly) return commercial
  if (compact) return <div>{identity}{commercial}</div>
  return <div className="grid gap-4 lg:grid-cols-2">{identity}{commercial}</div>
}
