import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Switch, Textarea } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { PAYMENT_TERMS, WILAYAS } from '@/constants/choices'

const EMPTY_FORM = {
  code: '', name: '', name_ar: '', trade_name: '', legal_form: '', activity: '',
  address: '', wilaya: '', commune: '', phone: '', email: '', website: '',
  rc: '', nif: '', nis: '', payment_term: '30', discount: 0, bank: '', rib: '',
  notes: '', lead_time_days: 0, warranty_months: 12, is_active: true,
}

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { number } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'buyer')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)

  const { data, isLoading, error } = useList('suppliers', { search, page_size: 25 })
  const saveSupplier = useSave('suppliers')
  const removeSupplier = useRemove('suppliers')

  const openCreate = () => {
    saveSupplier.reset()
    setForm({ ...EMPTY_FORM })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get('suppliers', row.id)
      saveSupplier.reset()
      setForm({ ...EMPTY_FORM, ...detail })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('suppliers.confirmDelete')} (${row.name})`)) {
      removeSupplier.mutate(row.id)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    saveSupplier.mutate(form, { onSuccess: () => setForm(null) })
  }

  const columns = [
    { key: 'code', label: t('table.code'), render: (r) => <span className="data">{r.code}</span> },
    { key: 'name', label: t('table.name'),
      render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'phone', label: t('table.phone'),
      render: (r) => <span className="data">{r.phone || '—'}</span> },
    { key: 'wilaya', label: t('table.wilaya') },
    { key: 'score', label: t('table.score'), align: 'num',
      render: (r) => number(r.score) },
    { key: 'is_active', label: t('table.status'),
      render: (r) => (
        <Badge status={r.is_active ? 'ok' : 'draft'}>
          {r.is_active ? t('status.validated') : t('status.cancelled')}
        </Badge>
      ) },
    ...(canWrite ? [{
      key: 'actions', label: t('common.actions'), align: 'num',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(r)} disabled={loadingEditId === r.id}
                  aria-label={t('common.edit')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600
                             disabled:opacity-40">
            <Pencil size={15} />
          </button>
          <button onClick={() => handleDelete(r)}
                  aria-label={t('common.delete')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-late-bg hover:text-late">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <PageHeader
        title={t('nav.suppliers')}
        subtitle={data ? `${data.count} ${t('common.total').toLowerCase()}` : undefined}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      {removeSupplier.isError && (
        <Alert tone="error">{errorText(removeSupplier.error, t('suppliers.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t('suppliers.edit') : t('suppliers.new')}
               onClose={() => setForm(null)} wide>
          <form onSubmit={submit}>
            {saveSupplier.isError && (
              <Alert tone="error">{errorText(saveSupplier.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('suppliers.code')} required help="Identifiant unique, ex : FRN004.">
                <Input value={form.code} required
                       onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </Field>
              <Field label={t('suppliers.name')} required>
                <Input value={form.name} required
                       onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={t('suppliers.nameAr')}>
                <Input dir="rtl" value={form.name_ar}
                       onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </Field>
              <Field label={t('suppliers.tradeName')}>
                <Input value={form.trade_name}
                       onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
              </Field>
              <Field label={t('suppliers.legalForm')}>
                <Input value={form.legal_form}
                       onChange={(e) => setForm({ ...form, legal_form: e.target.value })} />
              </Field>
              <Field label={t('suppliers.activity')}>
                <Input value={form.activity}
                       onChange={(e) => setForm({ ...form, activity: e.target.value })} />
              </Field>
              <Field label={t('table.wilaya')}>
                <Select value={form.wilaya}
                        onChange={(e) => setForm({ ...form, wilaya: e.target.value })}>
                  <option value="">—</option>
                  {WILAYAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('table.commune')}>
                <Input value={form.commune}
                       onChange={(e) => setForm({ ...form, commune: e.target.value })} />
              </Field>
              <Field label={t('table.phone')}>
                <Input value={form.phone}
                       onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label={t('suppliers.email')}>
                <Input type="email" value={form.email}
                       onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={t('suppliers.website')}>
                <Input type="url" value={form.website}
                       onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </Field>
              <Field label="RC">
                <Input value={form.rc}
                       onChange={(e) => setForm({ ...form, rc: e.target.value })} />
              </Field>
              <Field label="NIF">
                <Input value={form.nif}
                       onChange={(e) => setForm({ ...form, nif: e.target.value })} />
              </Field>
              <Field label="NIS">
                <Input value={form.nis}
                       onChange={(e) => setForm({ ...form, nis: e.target.value })} />
              </Field>
              <Field label={t('suppliers.paymentTerm')}>
                <Select value={form.payment_term}
                        onChange={(e) => setForm({ ...form, payment_term: e.target.value })}>
                  {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('suppliers.discount')}>
                <Input type="number" step="0.01" value={form.discount}
                       onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </Field>
              <Field label={t('suppliers.bank')}>
                <Input value={form.bank}
                       onChange={(e) => setForm({ ...form, bank: e.target.value })} />
              </Field>
              <Field label="RIB">
                <Input value={form.rib}
                       onChange={(e) => setForm({ ...form, rib: e.target.value })} />
              </Field>
              <Field label={t('suppliers.leadTime')}>
                <Input type="number" value={form.lead_time_days}
                       onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
              </Field>
              <Field label={t('suppliers.warranty')}>
                <Input type="number" value={form.warranty_months}
                       onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('suppliers.address')}>
                  <Textarea value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t('suppliers.notes')}>
                  <Textarea value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Field>
              </div>
            </div>

            <Switch checked={!!form.is_active}
                    onChange={() => setForm({ ...form, is_active: !form.is_active })}
                    label={t('suppliers.active')} />

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={saveSupplier.isPending}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
