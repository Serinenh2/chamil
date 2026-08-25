import { useTranslation } from 'react-i18next'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { PAYMENT_TERMS } from '@/constants/choices'
import { communeOptions, wilayaOptions } from '@/constants/geo'
import { useUi } from '@/context/UiContext'

/**
 * Champs communs aux fournisseurs et clients (PartnerBase côté backend).
 * `children` insère les champs propres à chaque entité (ex: délai/garantie
 * pour un fournisseur, type/plafond pour un client) juste avant l'adresse.
 */
export default function PartnerFormFields({ form, setForm, codeHint, children }) {
  const { t } = useTranslation()
  const { lang } = useUi()
  const set = (patch) => setForm({ ...form, ...patch })

  return (
    <>
      <Field label={t('partners.code')} required help={codeHint}>
        <Input value={form.code} required onChange={(e) => set({ code: e.target.value })} />
      </Field>
      <Field label={t('partners.name')} required>
        <Input value={form.name} required onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label={t('partners.nameAr')}>
        <Input dir="rtl" value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
      </Field>
      <Field label={t('partners.tradeName')}>
        <Input value={form.trade_name} onChange={(e) => set({ trade_name: e.target.value })} />
      </Field>
      <Field label={t('partners.legalForm')}>
        <Input value={form.legal_form} onChange={(e) => set({ legal_form: e.target.value })} />
      </Field>
      <Field label={t('partners.activity')}>
        <Input value={form.activity} onChange={(e) => set({ activity: e.target.value })} />
      </Field>
      <Field label={t('table.wilaya')}>
        <Select value={form.wilaya}
                onChange={(e) => set({ wilaya: e.target.value, commune: '' })}>
          <option value="">—</option>
          {wilayaOptions(lang).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label={t('table.commune')}>
        <Select value={form.commune} disabled={!form.wilaya}
                onChange={(e) => set({ commune: e.target.value })}>
          <option value="">—</option>
          {communeOptions(form.wilaya, lang).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label={t('table.phone')}>
        <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label={t('partners.email')}>
        <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field label={t('partners.website')}>
        <Input type="url" value={form.website} onChange={(e) => set({ website: e.target.value })} />
      </Field>
      <Field label="RC">
        <Input value={form.rc} onChange={(e) => set({ rc: e.target.value })} />
      </Field>
      <Field label="NIF">
        <Input value={form.nif} onChange={(e) => set({ nif: e.target.value })} />
      </Field>
      <Field label="NIS">
        <Input value={form.nis} onChange={(e) => set({ nis: e.target.value })} />
      </Field>
      <Field label={t('partners.paymentTerm')}>
        <Select value={form.payment_term} onChange={(e) => set({ payment_term: e.target.value })}>
          {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label={t('partners.discount')}>
        <Input type="number" step="0.01" value={form.discount}
               onChange={(e) => set({ discount: e.target.value })} />
      </Field>
      <Field label={t('partners.bank')}>
        <Input value={form.bank} onChange={(e) => set({ bank: e.target.value })} />
      </Field>
      <Field label="RIB">
        <Input value={form.rib} onChange={(e) => set({ rib: e.target.value })} />
      </Field>

      {children}

      <div className="sm:col-span-2">
        <Field label={t('partners.address')}>
          <Textarea value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t('partners.notes')}>
          <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
    </>
  )
}
