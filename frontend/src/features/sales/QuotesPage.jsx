import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import {
  Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Textarea,
} from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { PAYMENT_TERMS } from '@/constants/choices'

const TONE = { draft: 'draft', pending: 'pending', validated: 'ok', refused: 'overdue' }

const EMPTY_LINE = { product: '', quantity: 1, unit_price: 0, discount: 0, vat_rate: 19 }
const EMPTY_FORM = {
  customer: '', payment_term: '30', valid_until: '', lead_time_days: 0,
  notes: '', line_items: [{ ...EMPTY_LINE }],
}

function errorText(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  return Object.values(data).flat().filter((v) => typeof v === 'string').join(' ') || fallback
}

function lineTotal(line) {
  const qty = Number(line.quantity) || 0
  const price = Number(line.unit_price) || 0
  const discount = Number(line.discount) || 0
  const vat = Number(line.vat_rate) || 0
  const net = qty * price * (1 - discount / 100)
  return net + (net * vat) / 100
}

export default function QuotesPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'sales')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)

  const { data, isLoading, error } = useList('quotes', { page_size: 25 })
  const { data: customers } = useList('customers', { page_size: 200 }, { enabled: !!form })
  const { data: products } = useList('products', { page_size: 200 }, { enabled: !!form })
  const saveQuote = useSave('quotes')
  const removeQuote = useRemove('quotes')

  const openCreate = () => {
    saveQuote.reset()
    setForm({ ...EMPTY_FORM, line_items: [{ ...EMPTY_LINE }] })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get('quotes', row.id)
      saveQuote.reset()
      setForm({
        id: detail.id,
        customer: detail.customer, payment_term: detail.payment_term,
        valid_until: detail.valid_until || '', lead_time_days: detail.lead_time_days,
        notes: detail.notes || '',
        line_items: detail.lines.length
          ? detail.lines.map((l) => ({
              id: l.id, product: l.product, quantity: l.quantity,
              unit_price: l.unit_price, discount: l.discount, vat_rate: l.vat_rate,
            }))
          : [{ ...EMPTY_LINE }],
      })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('quotes.confirmDelete')} (${row.number})`)) {
      removeQuote.mutate(row.id)
    }
  }

  const updateLine = (idx, patch) => setForm({
    ...form, line_items: form.line_items.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
  })
  const addLine = () => setForm({ ...form, line_items: [...form.line_items, { ...EMPTY_LINE }] })
  const removeLine = (idx) => setForm({
    ...form, line_items: form.line_items.filter((_, i) => i !== idx),
  })
  const onProductChange = (idx, productId) => {
    const product = products?.results?.find((p) => String(p.id) === String(productId))
    updateLine(idx, {
      product: productId,
      unit_price: product?.sale_price ?? 0,
      vat_rate: product?.vat_rate ?? 19,
    })
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form, line_items: form.line_items.filter((l) => l.product) }
    saveQuote.mutate(payload, { onSuccess: () => setForm(null) })
  }

  const quoteTotal = form ? form.line_items.reduce((sum, l) => sum + lineTotal(l), 0) : 0

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'customer_name', label: t('table.customer') },
    { key: 'amount_ttc', label: t('table.amount'), align: 'num', render: (r) => money(r.amount_ttc) },
    { key: 'valid_until', label: t('table.due'), align: 'num', render: (r) => date(r.valid_until) },
    { key: 'status', label: t('table.status'),
      render: (r) => <Badge status={TONE[r.status] || 'draft'}>{r.status_label}</Badge> },
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
        title={t('nav.quotes')}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      {removeQuote.isError && (
        <Alert tone="error">{errorText(removeQuote.error, t('quotes.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t('quotes.edit') : t('quotes.new')}
               onClose={() => setForm(null)} size="xl">
          <form onSubmit={submit}>
            {saveQuote.isError && (
              <Alert tone="error">{errorText(saveQuote.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('table.customer')} required>
                <Select value={form.customer} required
                        onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                  <option value="">—</option>
                  {customers?.results?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('partners.paymentTerm')}>
                <Select value={form.payment_term}
                        onChange={(e) => setForm({ ...form, payment_term: e.target.value })}>
                  {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('quotes.validUntil')}>
                <Input type="date" value={form.valid_until}
                       onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </Field>
              <Field label={t('suppliers.leadTime')}>
                <Input type="number" value={form.lead_time_days}
                       onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
              </Field>
            </div>

            <h4 className="mb-2 mt-1 text-sm font-semibold">{t('purchaseOrders.lines')}</h4>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full border-collapse text-[0.8125rem]">
                <thead>
                  <tr>
                    <th className="th min-w-[180px]">{t('table.name')}</th>
                    <th className="th min-w-[84px] text-end">{t('table.quantity')}</th>
                    <th className="th min-w-[132px] text-end">{t('table.price')}</th>
                    <th className="th min-w-[84px] text-end">{t('partners.discount')}</th>
                    <th className="th min-w-[100px] text-end">TVA %</th>
                    <th className="th min-w-[130px] text-end">{t('table.amount')}</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map((line, idx) => (
                    <tr key={idx}>
                      <td className="td min-w-[180px]">
                        <Select value={line.product}
                                onChange={(e) => onProductChange(idx, e.target.value)}>
                          <option value="">—</option>
                          {products?.results?.map((p) => (
                            <option key={p.id} value={p.id}>{p.code} — {p.designation}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="td-num min-w-[84px]">
                        <Input type="number" step="0.01" min="0" value={line.quantity}
                               onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                      </td>
                      <td className="td-num min-w-[132px]">
                        <Input type="number" step="0.01" min="0" value={line.unit_price}
                               onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                      </td>
                      <td className="td-num min-w-[84px]">
                        <Input type="number" step="0.01" min="0" value={line.discount}
                               onChange={(e) => updateLine(idx, { discount: e.target.value })} />
                      </td>
                      <td className="td-num min-w-[100px]">
                        <Input type="number" step="0.01" min="0" value={line.vat_rate}
                               onChange={(e) => updateLine(idx, { vat_rate: e.target.value })} />
                      </td>
                      <td className="td-num min-w-[130px] data">{money(lineTotal(line))}</td>
                      <td className="td">
                        <button type="button" onClick={() => removeLine(idx)}
                                aria-label={t('common.delete')}
                                className="rounded-sm p-1.5 text-subtle hover:bg-late-bg hover:text-late">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addLine}>
                {t('purchaseOrders.addLine')}
              </Button>
              <span className="text-sm font-semibold">
                {t('table.amount')} : <span className="data">{money(quoteTotal)}</span>
              </span>
            </div>

            <div className="mt-4">
              <Field label={t('partners.notes')}>
                <Textarea value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>

            <div className="mt-2 flex gap-2">
              <Button type="submit" disabled={saveQuote.isPending}>
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
