import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Switch } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { CUSTOMER_TYPES } from '@/constants/choices'
import PartnerFormFields from './PartnerFormFields'

const EMPTY_FORM = {
  code: '', name: '', name_ar: '', trade_name: '', legal_form: '', activity: '',
  address: '', wilaya: '', commune: '', phone: '', email: '', website: '',
  rc: '', nif: '', nis: '', payment_term: '30', discount: 0, bank: '', rib: '',
  notes: '', customer_type: 'private', credit_limit: 0, is_active: true,
}

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

export default function CustomersPage() {
  const { t } = useTranslation()
  const { money } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'sales')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)

  const { data, isLoading, error } = useList('customers', { search, page_size: 25 })
  const saveCustomer = useSave('customers')
  const removeCustomer = useRemove('customers')

  const openCreate = () => {
    saveCustomer.reset()
    setForm({ ...EMPTY_FORM })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get('customers', row.id)
      saveCustomer.reset()
      setForm({ ...EMPTY_FORM, ...detail })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('customers.confirmDelete')} (${row.name})`)) {
      removeCustomer.mutate(row.id)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    saveCustomer.mutate(form, { onSuccess: () => setForm(null) })
  }

  const columns = [
    { key: 'code', label: t('table.code'), render: (r) => <span className="data">{r.code}</span> },
    { key: 'name', label: t('table.name'),
      render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'type_label', label: 'Type' },
    { key: 'phone', label: t('table.phone'), render: (r) => <span className="data">{r.phone || '—'}</span> },
    { key: 'credit_limit', label: 'Plafond', align: 'num', render: (r) => money(r.credit_limit) },
    { key: 'is_active', label: t('table.status'),
      render: (r) => <Badge status={r.is_active ? 'ok' : 'draft'}>
        {r.is_active ? t('status.validated') : t('status.cancelled')}</Badge> },
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
        title={t('nav.customers')}
        subtitle={data ? `${data.count}` : undefined}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      {removeCustomer.isError && (
        <Alert tone="error">{errorText(removeCustomer.error, t('customers.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t('customers.edit') : t('customers.new')}
               onClose={() => setForm(null)} wide>
          <form onSubmit={submit}>
            {saveCustomer.isError && (
              <Alert tone="error">{errorText(saveCustomer.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <PartnerFormFields form={form} setForm={setForm} codeHint="Identifiant unique, ex : CLI004.">
                <Field label={t('customers.customerType')}>
                  <Select value={form.customer_type}
                          onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                    {CUSTOMER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label={t('customers.creditLimit')}>
                  <Input type="number" step="0.01" value={form.credit_limit}
                         onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
                </Field>
              </PartnerFormFields>
            </div>

            <Switch checked={!!form.is_active}
                    onChange={() => setForm({ ...form, is_active: !form.is_active })}
                    label={t('partners.active')} />

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={saveCustomer.isPending}>
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
