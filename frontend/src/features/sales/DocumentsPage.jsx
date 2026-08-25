import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  Download, FileSignature, FileText, Pencil, Plus, Receipt, ShoppingCart, Trash2, Truck,
} from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import {
  Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Switch, Tabs, Textarea,
} from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { PAYMENT_TERMS } from '@/constants/choices'
import LineItemsEditor, { EMPTY_LINE } from './LineItemsEditor'

const RESOURCE = { proforma: 'quotes', bc: 'sales-orders', bl: 'deliveries', facture: 'customer-invoices' }
const KIND = { proforma: 'quote', bc: 'sales_order', bl: 'delivery', facture: 'customer_invoice' }

const WRITE_ROLES = {
  proforma: ['admin', 'sales'], bc: ['admin', 'sales'],
  bl: ['admin', 'sales', 'stock'], facture: ['admin', 'sales', 'accountant'],
}

const NEXT_ACTION = {
  proforma: { action: 'to_order', nextTab: 'bc' },
  bc: { action: 'to_delivery', nextTab: 'bl' },
  bl: { action: 'to_invoice', nextTab: 'facture' },
  facture: null,
}

const DOC_TONE = { draft: 'draft', pending: 'pending', validated: 'ok',
                   partial: 'pending', completed: 'ok', cancelled: 'cancelled', refused: 'overdue' }
const INVOICE_TONE = { draft: 'draft', pending: 'pending', partial: 'pending',
                       paid: 'ok', overdue: 'overdue', cancelled: 'cancelled' }
const TONE = { proforma: DOC_TONE, bc: DOC_TONE, bl: DOC_TONE, facture: INVOICE_TONE }

const DATE_FIELDS = {
  proforma: ['valid_until'], bc: ['expected_on'], bl: ['delivered_on'], facture: ['due_date'],
}

const EMPTY_FORMS = {
  proforma: { customer: '', payment_term: '30', valid_until: '', lead_time_days: 0, notes: '' },
  bc: { customer: '', payment_term: '30', delivery_address: '', expected_on: '', notes: '' },
  bl: { customer: '', warehouse: '', delivered_on: '', is_partial: false, received_by: '', notes: '' },
  facture: { customer: '', payment_term: '30', due_date: '', stamp_duty: 0, notes: '' },
}

function errorText(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  return Object.values(data).flat().filter((v) => typeof v === 'string').join(' ') || fallback
}

function docToForm(tab, detail) {
  const base = EMPTY_FORMS[tab]
  const form = { id: detail.id }
  Object.keys(base).forEach((k) => { form[k] = detail[k] ?? base[k] })
  form.line_items = (detail.lines || []).length
    ? detail.lines.map((l) => ({
        id: l.id, product: l.product, quantity: l.quantity,
        unit_price: l.unit_price, discount: l.discount, vat_rate: l.vat_rate,
      }))
    : [{ ...EMPTY_LINE }]
  return form
}

export default function DocumentsPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { can } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState('proforma')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)
  const [generatingId, setGeneratingId] = useState(null)
  const [generateError, setGenerateError] = useState(null)
  const [downloadingKey, setDownloadingKey] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  const resource = RESOURCE[tab]
  const canWrite = can(...WRITE_ROLES[tab])

  const { data, isLoading, error } = useList(resource, { page_size: 25 })
  const { data: customers } = useList('customers', { page_size: 200 }, { enabled: !!form })
  const { data: products } = useList('products', { page_size: 200 }, { enabled: !!form })
  const { data: warehouses } = useList('warehouses', { page_size: 50 }, { enabled: !!form && tab === 'bl' })
  const saveDoc = useSave(resource)
  const removeDoc = useRemove(resource)

  const openCreate = () => {
    saveDoc.reset()
    setForm({ ...EMPTY_FORMS[tab], line_items: [{ ...EMPTY_LINE }] })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get(resource, row.id)
      saveDoc.reset()
      setForm(docToForm(tab, detail))
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('documents.confirmDelete')} (${row.number})`)) {
      removeDoc.mutate(row.id)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form, line_items: form.line_items.filter((l) => l.product) }
    DATE_FIELDS[tab].forEach((field) => { if (payload[field] === '') payload[field] = null })
    saveDoc.mutate(payload, { onSuccess: () => setForm(null) })
  }

  const handleGenerateNext = async (row) => {
    const next = NEXT_ACTION[tab]
    if (!next) return
    setGeneratingId(row.id)
    setGenerateError(null)
    try {
      const result = await rest.action(`/${resource}/${row.id}/${next.action}/`, {})
      qc.invalidateQueries({ queryKey: [RESOURCE[next.nextTab]] })
      setTab(next.nextTab)
      setForm(docToForm(next.nextTab, result))
    } catch (err) {
      setGenerateError(errorText(err, t('common.error')))
    } finally {
      setGeneratingId(null)
    }
  }

  const download = async (row, format) => {
    const key = `${row.id}-${format}`
    setDownloadingKey(key)
    setDownloadError(null)
    try {
      const blob = await rest.download(`/documents/${KIND[tab]}/${row.id}/${format}/`)
      const mime = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const url = window.URL.createObjectURL(new Blob([blob], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${row.number}.${format === 'pdf' ? 'pdf' : 'docx'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      let message = t('common.error')
      if (err.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await err.response.data.text())
          message = parsed.detail || message
        } catch { /* garde le message par défaut */ }
      }
      setDownloadError(message)
    } finally {
      setDownloadingKey(null)
    }
  }

  const columns = (() => {
    const base = [
      { key: 'number', label: t('table.number'),
        render: (r) => <span className="data font-semibold">{r.number}</span> },
      { key: 'customer_name', label: t('table.customer') },
      { key: 'amount_ttc', label: t('table.amount'), align: 'num', render: (r) => money(r.amount_ttc) },
    ]
    if (tab === 'proforma') base.push(
      { key: 'valid_until', label: t('documents.validUntil'), align: 'num', render: (r) => date(r.valid_until) })
    if (tab === 'bc') base.push(
      { key: 'expected_on', label: t('purchaseOrders.expectedOn'), align: 'num', render: (r) => date(r.expected_on) })
    if (tab === 'bl') base.push(
      { key: 'delivered_on', label: t('documents.deliveredOn'), align: 'num', render: (r) => date(r.delivered_on) })
    if (tab === 'facture') base.push(
      { key: 'balance', label: t('table.balance'), align: 'num',
        render: (r) => <span className={Number(r.balance) > 0 ? 'text-late' : 'text-ok'}>{money(r.balance)}</span> },
      { key: 'due_date', label: t('table.due'), align: 'num', render: (r) => date(r.due_date) },
    )
    base.push({ key: 'status', label: t('table.status'),
      render: (r) => <Badge status={TONE[tab][r.status] || 'draft'}>{r.status_label}</Badge> })
    base.push({
      key: 'actions', label: t('common.actions'), align: 'num',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {canWrite && NEXT_ACTION[tab] && (
            <Button size="sm" variant="secondary" disabled={generatingId === r.id}
                    onClick={() => handleGenerateNext(r)}>
              {t(`documents.generate_${NEXT_ACTION[tab].nextTab}`)}
            </Button>
          )}
          <button onClick={() => download(r, 'pdf')} disabled={downloadingKey === `${r.id}-pdf`}
                  aria-label={t('documents.downloadPdf')} title={t('documents.downloadPdf')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600
                             disabled:opacity-40">
            <Download size={15} />
          </button>
          <button onClick={() => download(r, 'word')} disabled={downloadingKey === `${r.id}-word`}
                  aria-label={t('documents.downloadWord')} title={t('documents.downloadWord')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600
                             disabled:opacity-40">
            <FileText size={15} />
          </button>
          {canWrite && (
            <>
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
            </>
          )}
        </div>
      ),
    })
    return base
  })()

  const tabs = [
    { key: 'proforma', label: t('documents.tabProforma') },
    { key: 'bc', label: t('documents.tabBc') },
    { key: 'bl', label: t('documents.tabBl') },
    { key: 'facture', label: t('documents.tabFacture') },
  ]

  return (
    <>
      <PageHeader
        title={t('nav.documents')}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t(`documents.new_${tab}`)}</Button>}
      />
      <div className="mb-4">
        <Tabs tabs={tabs} active={tab} onChange={(k) => { setTab(k); setForm(null) }} />
      </div>
      {generateError && <Alert tone="error">{generateError}</Alert>}
      {downloadError && <Alert tone="error">{downloadError}</Alert>}
      {removeDoc.isError && (
        <Alert tone="error">{errorText(removeDoc.error, t('documents.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t(`documents.edit_${tab}`) : t(`documents.new_${tab}`)}
               onClose={() => setForm(null)} size="xl">
          <form onSubmit={submit}>
            {saveDoc.isError && (
              <Alert tone="error">{errorText(saveDoc.error, t('common.error'))}</Alert>
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

              {tab !== 'bl' && (
                <Field label={t('partners.paymentTerm')}>
                  <Select value={form.payment_term}
                          onChange={(e) => setForm({ ...form, payment_term: e.target.value })}>
                    {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
              )}

              {tab === 'proforma' && <>
                <Field label={t('documents.validUntil')}>
                  <Input type="date" value={form.valid_until}
                         onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </Field>
                <Field label={t('suppliers.leadTime')}>
                  <Input type="number" value={form.lead_time_days}
                         onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
                </Field>
              </>}

              {tab === 'bc' && <>
                <Field label={t('purchaseOrders.expectedOn')}>
                  <Input type="date" value={form.expected_on}
                         onChange={(e) => setForm({ ...form, expected_on: e.target.value })} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t('purchaseOrders.deliveryAddress')}>
                    <Textarea value={form.delivery_address}
                              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
                  </Field>
                </div>
              </>}

              {tab === 'bl' && <>
                <Field label={t('documents.warehouse')} required>
                  <Select value={form.warehouse} required
                          onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                    <option value="">—</option>
                    {warehouses?.results?.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('documents.deliveredOn')}>
                  <Input type="date" value={form.delivered_on}
                         onChange={(e) => setForm({ ...form, delivered_on: e.target.value })} />
                </Field>
                <Field label={t('documents.receivedBy')}>
                  <Input value={form.received_by}
                         onChange={(e) => setForm({ ...form, received_by: e.target.value })} />
                </Field>
                <div className="flex items-end pb-2.5">
                  <Switch checked={!!form.is_partial}
                          onChange={() => setForm({ ...form, is_partial: !form.is_partial })}
                          label={t('documents.partial')} />
                </div>
              </>}

              {tab === 'facture' && <>
                <Field label={t('documents.dueDate')}>
                  <Input type="date" value={form.due_date}
                         onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </Field>
                <Field label={t('documents.stampDuty')}>
                  <Input type="number" step="0.01" value={form.stamp_duty}
                         onChange={(e) => setForm({ ...form, stamp_duty: e.target.value })} />
                </Field>
              </>}
            </div>

            <h4 className="mb-2 mt-1 text-sm font-semibold">{t('purchaseOrders.lines')}</h4>
            <LineItemsEditor
              lines={form.line_items}
              products={products?.results}
              priceField="sale_price"
              onChange={(line_items) => setForm({ ...form, line_items })}
            />

            <div className="mt-4">
              <Field label={t('partners.notes')}>
                <Textarea value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>

            <div className="mt-2 flex gap-2">
              <Button type="submit" disabled={saveDoc.isPending}>
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
