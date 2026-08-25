import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rest } from '@/services/api'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { useAuth } from '@/context/AuthContext'
import { Alert, Button, Card, Field, Input, KeyValue, Select, Spinner, Textarea } from '@/components/ui'
import { PAYMENT_TERMS, WILAYAS } from '@/constants/choices'
import ImageUploader from './ImageUploader'

const LEGAL_FORMS = [
  ['EURL', 'EURL'], ['SARL', 'SARL'], ['SPA', 'SPA'], ['SNC', 'SNC'],
  ['ETS', 'Établissement'], ['OTHER', 'Autre'],
]
const DOC_LANGS = [['ar', 'Arabe'], ['fr', 'Français'], ['both', 'Bilingue AR / FR']]

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

/** Identité légale de l'entreprise et paramètres commerciaux (sections 39.2 et 39.3). */
export default function CompanyTab({ compact = false, settingsOnly = false }) {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { can } = useAuth()
  const qc = useQueryClient()
  const canEdit = can('admin')

  const { data: company, isLoading } = useEndpoint('/profile/company/current/')
  const { data: settings } = useEndpoint('/profile/settings/current/')

  const [editingCompany, setEditingCompany] = useState(false)
  const [companyForm, setCompanyForm] = useState(null)
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState(null)

  const saveCompany = useMutation({
    mutationFn: (payload) => rest.patch('/profile/company/current/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/profile/company/current/'] })
      setEditingCompany(false)
    },
  })
  const saveSettings = useMutation({
    mutationFn: (payload) => rest.patch('/profile/settings/current/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/profile/settings/current/'] })
      setEditingSettings(false)
    },
  })

  const invalidateCompany = () => qc.invalidateQueries({ queryKey: ['/profile/company/current/'] })
  const uploadLogo = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('logo', file)
      return rest.patch('/profile/company/current/', fd)
    },
    onSuccess: invalidateCompany,
  })
  const deleteLogo = useMutation({
    mutationFn: () => rest.patch('/profile/company/current/', { logo: null }),
    onSuccess: invalidateCompany,
  })
  const uploadStamp = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('stamp', file)
      return rest.patch('/profile/company/current/', fd)
    },
    onSuccess: invalidateCompany,
  })
  const deleteStamp = useMutation({
    mutationFn: () => rest.patch('/profile/company/current/', { stamp: null }),
    onSuccess: invalidateCompany,
  })

  if (isLoading) return <Card><div className="flex justify-center py-6"><Spinner /></div></Card>

  const startEditCompany = () => {
    setCompanyForm({
      name: company?.name || '', name_ar: company?.name_ar || '',
      legal_form: company?.legal_form || 'SARL', capital: company?.capital ?? 0,
      rc: company?.rc || '', nif: company?.nif || '', nis: company?.nis || '',
      tax_article: company?.tax_article || '',
      wilaya: company?.wilaya || '', commune: company?.commune || '',
      phone: company?.phone || '', email: company?.email || '',
      rib: company?.rib || '', address: company?.address || '', founded_on: company?.founded_on || '',
    })
    setEditingCompany(true)
  }

  const startEditSettings = () => {
    setSettingsForm({
      default_vat_rate: String(settings?.default_vat_rate ?? '19'), currency: settings?.currency || 'DA',
      default_payment_term: settings?.default_payment_term || '30',
      default_credit_limit: settings?.default_credit_limit ?? 0,
      prefix_invoice: settings?.prefix_invoice || 'FA',
      document_language: settings?.document_language || 'both',
    })
    setEditingSettings(true)
  }

  const identity = (
    <Card title={t('profile.company')}
          action={canEdit && !editingCompany && (
            <Button size="sm" variant="secondary" onClick={startEditCompany}>{t('common.edit')}</Button>
          )}>
      {saveCompany.isError && (
        <Alert tone="error">{errorText(saveCompany.error, t('common.error'))}</Alert>
      )}
      {canEdit && !compact && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <ImageUploader label={t('profile.logo')} imageUrl={company?.logo}
                         onUpload={(file) => uploadLogo.mutateAsync(file)}
                         onDelete={() => deleteLogo.mutateAsync()} />
          <ImageUploader label={t('profile.stamp')} imageUrl={company?.stamp}
                         onUpload={(file) => uploadStamp.mutateAsync(file)}
                         onDelete={() => deleteStamp.mutateAsync()} />
        </div>
      )}
      {editingCompany ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('profile.companyName')} required>
              <Input value={companyForm.name}
                     onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
            </Field>
            <Field label="التسمية">
              <Input dir="rtl" value={companyForm.name_ar}
                     onChange={(e) => setCompanyForm({ ...companyForm, name_ar: e.target.value })} />
            </Field>
            <Field label={t('profile.legalForm')}>
              <Select value={companyForm.legal_form}
                      onChange={(e) => setCompanyForm({ ...companyForm, legal_form: e.target.value })}>
                {LEGAL_FORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label={t('profile.capital')}>
              <Input type="number" step="0.01" value={companyForm.capital}
                     onChange={(e) => setCompanyForm({ ...companyForm, capital: e.target.value })} />
            </Field>
            <Field label="RC">
              <Input value={companyForm.rc}
                     onChange={(e) => setCompanyForm({ ...companyForm, rc: e.target.value })} />
            </Field>
            <Field label="NIF">
              <Input value={companyForm.nif}
                     onChange={(e) => setCompanyForm({ ...companyForm, nif: e.target.value })} />
            </Field>
            <Field label="NIS">
              <Input value={companyForm.nis}
                     onChange={(e) => setCompanyForm({ ...companyForm, nis: e.target.value })} />
            </Field>
            <Field label="AI">
              <Input value={companyForm.tax_article}
                     onChange={(e) => setCompanyForm({ ...companyForm, tax_article: e.target.value })} />
            </Field>
            <Field label={t('table.wilaya')}>
              <Select value={companyForm.wilaya}
                      onChange={(e) => setCompanyForm({ ...companyForm, wilaya: e.target.value })}>
                <option value="">—</option>
                {WILAYAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label={t('table.commune')}>
              <Input value={companyForm.commune}
                     onChange={(e) => setCompanyForm({ ...companyForm, commune: e.target.value })} />
            </Field>
            {!compact && <>
              <Field label={t('table.phone')}>
                <Input value={companyForm.phone}
                       onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={companyForm.email}
                       onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
              </Field>
              <Field label="RIB">
                <Input value={companyForm.rib}
                       onChange={(e) => setCompanyForm({ ...companyForm, rib: e.target.value })} />
              </Field>
              <Field label="Date de création">
                <Input type="date" value={companyForm.founded_on || ''}
                       onChange={(e) => setCompanyForm({ ...companyForm, founded_on: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('profile.headOffice')}>
                  <Textarea value={companyForm.address}
                            onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
                </Field>
              </div>
            </>}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={saveCompany.isPending}
                    onClick={() => saveCompany.mutate({
                      ...companyForm, founded_on: companyForm.founded_on || null,
                    })}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingCompany(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <KeyValue label={t('profile.companyName')} value={company?.name} />
          <KeyValue label="التسمية" value={company?.name_ar} />
          <KeyValue label={t('profile.legalForm')} value={company?.legal_form_label} />
          <KeyValue label={t('profile.capital')} value={money(company?.capital)} mono />
          <KeyValue label="RC" value={company?.rc} mono />
          <KeyValue label="NIF" value={company?.nif} mono />
          <KeyValue label="NIS" value={company?.nis} mono />
          <KeyValue label="AI" value={company?.tax_article} mono />
          <KeyValue label={t('table.wilaya')} value={company?.wilaya_label} />
          <KeyValue label={t('table.commune')} value={company?.commune} />
          {!compact && <>
            <KeyValue label={t('table.phone')} value={company?.phone} mono />
            <KeyValue label="Email" value={company?.email} mono />
            <KeyValue label="RIB" value={company?.rib} mono />
            <KeyValue label="Date de création" value={date(company?.founded_on)} mono />
            <div className="sm:col-span-2">
              <KeyValue label={t('profile.headOffice')} value={company?.address} />
            </div>
          </>}
        </dl>
      )}
    </Card>
  )

  const commercial = (
    <Card title={t('profile.settings')} className={compact ? 'mt-4' : ''}
          action={canEdit && !editingSettings && (
            <Button size="sm" variant="secondary" onClick={startEditSettings}>{t('common.edit')}</Button>
          )}>
      {saveSettings.isError && (
        <Alert tone="error">{errorText(saveSettings.error, t('common.error'))}</Alert>
      )}
      {editingSettings ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('profile.vat')}>
              <Select value={settingsForm.default_vat_rate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_vat_rate: e.target.value })}>
                <option value="19">19 %</option>
                <option value="9">9 %</option>
                <option value="0">0 %</option>
              </Select>
            </Field>
            <Field label={t('profile.currency')}>
              <Input value={settingsForm.currency} maxLength={5}
                     onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })} />
            </Field>
            <Field label={t('profile.paymentTerm')}>
              <Select value={settingsForm.default_payment_term}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_payment_term: e.target.value })}>
                {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label={t('profile.creditLimit')}>
              <Input type="number" step="0.01" value={settingsForm.default_credit_limit}
                     onChange={(e) => setSettingsForm({ ...settingsForm, default_credit_limit: e.target.value })} />
            </Field>
            <Field label={t('profile.numbering')} help="Préfixe des factures.">
              <Input value={settingsForm.prefix_invoice} maxLength={6}
                     onChange={(e) => setSettingsForm({ ...settingsForm, prefix_invoice: e.target.value })} />
            </Field>
            <Field label={t('profile.docLang')}>
              <Select value={settingsForm.document_language}
                      onChange={(e) => setSettingsForm({ ...settingsForm, document_language: e.target.value })}>
                {DOC_LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={saveSettings.isPending}
                    onClick={() => saveSettings.mutate(settingsForm)}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingSettings(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <KeyValue label={t('profile.vat')} value={`${settings?.default_vat_rate ?? '—'} %`} mono />
          <KeyValue label={t('profile.currency')} value={settings?.currency} mono />
          <KeyValue label={t('profile.paymentTerm')} value={settings?.default_payment_term} mono />
          <KeyValue label={t('profile.creditLimit')} value={money(settings?.default_credit_limit)} mono />
          <KeyValue label={t('profile.numbering')}
                    value={`${settings?.prefix_invoice ?? 'FA'}-${new Date().getFullYear()}-0000`} mono />
          <KeyValue label={t('profile.docLang')} value={settings?.document_language} />
        </dl>
      )}
    </Card>
  )

  if (settingsOnly) return commercial
  if (compact) return <div>{identity}{commercial}</div>
  return <div className="grid gap-4 lg:grid-cols-2">{identity}{commercial}</div>
}
