import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Button, DataTable, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { PAYMENT_METHODS } from '@/constants/choices'

const EMPTY_FORM = {
  supplier: '', supplier_invoice: '', paid_on: new Date().toISOString().slice(0, 10),
  amount: 0, is_settled: false, settlement_date: '', method: 'transfer', reference: '', note: '',
}

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

export default function SupplierPaymentsPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'accountant')
  const [form, setForm] = useState(null)
  const [invoiceSearchOpen, setInvoiceSearchOpen] = useState(false)
  const [invoiceQuery, setInvoiceQuery] = useState('')

  const { data, isLoading, error } = useList('payments', { direction: 'out', page_size: 25 })
  const { data: suppliers } = useList('suppliers', { page_size: 200 }, { enabled: !!form })
  const { data: invoices } = useList(
    'supplier-invoices', { supplier: form?.supplier, page_size: 100 },
    { enabled: !!form?.supplier },
  )
  const { data: invoiceResults } = useList(
    'supplier-invoices', { search: invoiceQuery, page_size: 8 },
    { enabled: invoiceSearchOpen && invoiceQuery.trim().length >= 2 },
  )
  const savePayment = useSave('payments')
  const removePayment = useRemove('payments')

  const openCreate = () => {
    savePayment.reset()
    setForm({ ...EMPTY_FORM })
  }

  const openEdit = (row) => {
    savePayment.reset()
    setForm({
      id: row.id, supplier: row.supplier || '', supplier_invoice: row.supplier_invoice || '',
      paid_on: row.paid_on, amount: row.amount, is_settled: !!row.is_settled,
      settlement_date: row.settlement_date || '', method: row.method,
      reference: row.reference || '', note: row.note || '',
    })
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('supplierPayments.confirmDelete')} (${row.number})`)) {
      removePayment.mutate(row.id)
    }
  }

  const handlePickInvoice = (invoice) => {
    setForm({
      ...form, supplier: invoice.supplier, supplier_invoice: invoice.id, amount: invoice.balance,
    })
    setInvoiceSearchOpen(false)
    setInvoiceQuery('')
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      ...form, direction: 'out', supplier_invoice: form.supplier_invoice || null,
      settlement_date: form.is_settled ? (form.settlement_date || null) : null,
    }
    savePayment.mutate(payload, { onSuccess: () => setForm(null) })
  }

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'paid_on', label: t('table.date'), render: (r) => date(r.paid_on) },
    { key: 'supplier_name', label: t('table.supplier') },
    { key: 'amount', label: t('table.amount'), align: 'num', render: (r) => money(r.amount) },
    { key: 'method_label', label: t('supplierPayments.method') },
    { key: 'reference', label: t('supplierPayments.reference'),
      render: (r) => <span className="data">{r.reference || '—'}</span> },
    ...(canWrite ? [{
      key: 'actions', label: t('common.actions'), align: 'num',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(r)} aria-label={t('common.edit')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600">
            <Pencil size={15} />
          </button>
          <button onClick={() => handleDelete(r)} aria-label={t('common.delete')}
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
        title={t('nav.supplierPayments')}
        subtitle={data ? `${data.count}` : undefined}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      {removePayment.isError && (
        <Alert tone="error">{errorText(removePayment.error, t('supplierPayments.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t('supplierPayments.edit') : t('supplierPayments.new')}
               onClose={() => setForm(null)} wide>
          <form onSubmit={submit}>
            {savePayment.isError && (
              <Alert tone="error">{errorText(savePayment.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('table.supplier')} required>
                <Select value={form.supplier} required
                        onChange={(e) => setForm({ ...form, supplier: e.target.value, supplier_invoice: '' })}>
                  <option value="">—</option>
                  {suppliers?.results?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('supplierPayments.invoice')}>
                <Select value={form.supplier_invoice} disabled={!form.supplier}
                        onChange={(e) => setForm({ ...form, supplier_invoice: e.target.value })}>
                  <option value="">—</option>
                  {invoices?.results?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.number} — {t('supplierPayments.balance')} {money(i.balance)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('table.date')} required>
                <Input type="date" value={form.paid_on} required
                       onChange={(e) => setForm({ ...form, paid_on: e.target.value })} />
              </Field>
              <Field label={t('table.amount')} required>
                <Input type="number" step="0.01" min="0.01" value={form.amount} required
                       onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label={t('supplierPayments.settled')}>
                <Select value={form.is_settled ? 'yes' : 'no'}
                        onChange={(e) => setForm({ ...form, is_settled: e.target.value === 'yes' })}>
                  <option value="no">{t('common.no')}</option>
                  <option value="yes">{t('common.yes')}</option>
                </Select>
              </Field>
              {form.is_settled && (
                <Field label={t('supplierPayments.settlementDate')}>
                  <Input type="date" value={form.settlement_date}
                         onChange={(e) => setForm({ ...form, settlement_date: e.target.value })} />
                </Field>
              )}
              <Field label={t('supplierPayments.method')}>
                <Select value={form.method}
                        onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {PAYMENT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('supplierPayments.reference')}>
                <Input value={form.reference}
                       onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('supplierPayments.note')}>
                  <Textarea value={form.note}
                            onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </Field>
              </div>
            </div>

            {invoiceSearchOpen && (
              <div className="mb-4 rounded-md border border-line p-3">
                <Field label={t('supplierPayments.searchInvoice')}>
                  <Input autoFocus value={invoiceQuery}
                         onChange={(e) => setInvoiceQuery(e.target.value)}
                         placeholder={t('supplierPayments.searchInvoicePlaceholder')} />
                </Field>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {invoiceResults?.results?.map((inv) => (
                    <li key={inv.id}>
                      <button type="button" onClick={() => handlePickInvoice(inv)}
                              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5
                                         text-sm hover:bg-primary-50">
                        <span className="data">{inv.number}</span>
                        <span className="truncate px-2 text-subtle">{inv.supplier_name}</span>
                        <span className="data shrink-0">{money(inv.balance)}</span>
                      </button>
                    </li>
                  ))}
                  {invoiceQuery.trim().length >= 2 && !invoiceResults?.results?.length && (
                    <li className="px-2 py-1.5 text-sm text-subtle">{t('common.empty')}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={savePayment.isPending}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" icon={Search}
                      onClick={() => setInvoiceSearchOpen((v) => !v)}>
                {t('supplierPayments.importInvoice')}
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
