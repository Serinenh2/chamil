import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'

const OPEN_ORDER_STATUSES = ['draft', 'pending', 'validated', 'partial']

const EMPTY_LINE = {
  product: '', description: '', unit_price: 0, discount: 0, vat_rate: 19,
  ordered_quantity: 0, quantity: 0, received_quantity: 0, damaged_quantity: 0, serial_numbers: '',
}

const EMPTY_FORM = {
  supplier: '', order: '', warehouse: '', received_on: new Date().toISOString().slice(0, 10),
  location: '', notes: '', line_items: [],
}

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().filter((v) => typeof v === 'string')
    .join(' ') || fallback
}

function lineAmount(line) {
  const qty = Number(line.quantity) || 0
  const price = Number(line.unit_price) || 0
  const discount = Number(line.discount) || 0
  const vat = Number(line.vat_rate) || 0
  const net = qty * price * (1 - discount / 100)
  return net + (net * vat) / 100
}

/** CSV avec en-tête "code;quantite" (ou "code,quantite") — export Excel FR ou standard. */
function parseReceiptCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const delimiter = lines[0].includes(';') ? ';' : ','
  const header = lines[0].toLowerCase().split(delimiter).map((h) => h.trim())
  const codeIdx = header.findIndex((h) => h.includes('code'))
  const qtyIdx = header.findIndex((h) => h.includes('quant'))
  const dataLines = codeIdx === -1 ? lines : lines.slice(1)
  return dataLines.map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim())
    return {
      code: cells[codeIdx === -1 ? 0 : codeIdx],
      quantity: Number((cells[qtyIdx === -1 ? 1 : qtyIdx] || '1').replace(',', '.')) || 1,
    }
  }).filter((row) => row.code)
}

export default function ReceiptsPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { can } = useAuth()
  const qc = useQueryClient()
  const canWrite = can('admin', 'buyer', 'stock')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  const { data, isLoading, error } = useList('goods-receipts', { page_size: 25 })
  const { data: suppliers } = useList('suppliers', { page_size: 200 }, { enabled: !!form })
  const { data: warehouses } = useList('warehouses', { page_size: 100 }, { enabled: !!form })
  const { data: products } = useList('products', { page_size: 200 }, { enabled: !!form })
  const { data: orders } = useList(
    'purchase-orders', { supplier: form?.supplier, page_size: 100 },
    { enabled: !!form?.supplier },
  )
  const saveReceipt = useSave('goods-receipts')
  const removeReceipt = useRemove('goods-receipts')

  const openCreate = () => {
    saveReceipt.reset()
    setForm({ ...EMPTY_FORM, line_items: [] })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get('goods-receipts', row.id)
      saveReceipt.reset()
      setForm({
        id: detail.id, readOnly: detail.stock_applied, supplier: detail.supplier,
        order: detail.order || '', warehouse: detail.warehouse,
        received_on: detail.received_on || '',
        location: detail.location || '', notes: detail.notes || '',
        line_items: detail.lines.map((l) => ({
          id: l.id, product: l.product, description: l.description,
          unit_price: l.unit_price, discount: l.discount, vat_rate: l.vat_rate,
          ordered_quantity: l.ordered_quantity, quantity: l.quantity,
          received_quantity: l.received_quantity, damaged_quantity: l.damaged_quantity,
          serial_numbers: l.serial_numbers,
        })),
      })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('receipts.confirmDelete')} (${row.number})`)) {
      removeReceipt.mutate(row.id)
    }
  }

  const handleApplyStock = async (row) => {
    if (!window.confirm(t('receipts.confirmApply'))) return
    setApplyingId(row.id)
    try {
      await rest.action(`/goods-receipts/${row.id}/apply_stock/`, {})
      qc.invalidateQueries({ queryKey: ['goods-receipts'] })
    } finally {
      setApplyingId(null)
    }
  }

  const onOrderChange = async (orderId) => {
    if (!orderId) {
      setForm({ ...form, order: '', line_items: [] })
      return
    }
    const order = await rest.get('purchase-orders', orderId)
    setForm({
      ...form, order: orderId,
      line_items: order.lines.map((l) => ({
        product: l.product, description: l.description, unit_price: l.unit_price,
        discount: l.discount, vat_rate: l.vat_rate, ordered_quantity: l.quantity,
        quantity: l.remaining_quantity, received_quantity: l.remaining_quantity,
        damaged_quantity: 0, serial_numbers: '',
      })),
    })
  }

  const updateLine = (idx, patch) => setForm({
    ...form, line_items: form.line_items.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
  })
  const setReceivedQty = (idx, value) => updateLine(idx, { quantity: value, received_quantity: value })
  const addLine = () => setForm({ ...form, line_items: [...form.line_items, { ...EMPTY_LINE }] })
  const removeLine = (idx) => setForm({
    ...form, line_items: form.line_items.filter((_, i) => i !== idx),
  })
  const onProductChange = (idx, productId) => {
    const product = products?.results?.find((p) => String(p.id) === String(productId))
    updateLine(idx, {
      product: productId, unit_price: product?.purchase_price ?? 0, vat_rate: product?.vat_rate ?? 19,
    })
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      ...form, order: form.order || null,
      line_items: form.line_items.filter((l) => l.product),
    }
    saveReceipt.mutate(payload, { onSuccess: () => setForm(null) })
  }

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseReceiptCsv(String(reader.result || ''))
      const notFound = []
      const imported = []
      rows.forEach(({ code, quantity }) => {
        const product = products?.results?.find(
          (p) => p.code.toLowerCase() === code.toLowerCase(),
        )
        if (!product) {
          notFound.push(code)
          return
        }
        imported.push({
          product: product.id, description: '', unit_price: product.purchase_price ?? 0,
          discount: 0, vat_rate: product.vat_rate ?? 19, ordered_quantity: 0,
          quantity, received_quantity: quantity, damaged_quantity: 0, serial_numbers: '',
        })
      })
      if (imported.length) {
        const existing = form.line_items.filter((l) => l.product)
        setForm({ ...form, line_items: [...existing, ...imported] })
      }
      setImportError(notFound.length
        ? `${t('receipts.importNotFound')} : ${notFound.join(', ')}` : null)
    }
    reader.readAsText(file)
  }

  const receiptTotal = form ? form.line_items.reduce((sum, l) => sum + lineAmount(l), 0) : 0
  const openOrders = orders?.results?.filter(
    (o) => OPEN_ORDER_STATUSES.includes(o.status) || String(o.id) === String(form?.order),
  ) || []

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'received_on', label: t('receipts.receivedOn'), render: (r) => date(r.received_on) },
    { key: 'supplier_name', label: t('table.supplier') },
    { key: 'order_number', label: t('receipts.order'),
      render: (r) => r.order_number || '—' },
    { key: 'warehouse_name', label: t('receipts.warehouse') },
    { key: 'amount_ttc', label: t('table.amount'), align: 'num', render: (r) => money(r.amount_ttc) },
    { key: 'stock_applied', label: t('table.status'),
      render: (r) => (
        <Badge status={r.stock_applied ? 'ok' : 'pending'}>
          {r.stock_applied ? t('receipts.stockApplied') : t('receipts.stockPending')}
        </Badge>
      ) },
    ...(canWrite ? [{
      key: 'actions', label: t('common.actions'), align: 'num',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {!r.stock_applied && (
            <button onClick={() => handleApplyStock(r)} disabled={applyingId === r.id}
                    aria-label={t('receipts.applyStock')}
                    className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600
                               disabled:opacity-40">
              <CheckCircle2 size={15} />
            </button>
          )}
          <button onClick={() => openEdit(r)} disabled={loadingEditId === r.id}
                  aria-label={t('common.edit')}
                  className="rounded-sm p-1.5 text-subtle hover:bg-primary-50 hover:text-primary-600
                             disabled:opacity-40">
            <Pencil size={15} />
          </button>
          {!r.stock_applied && (
            <button onClick={() => handleDelete(r)} aria-label={t('common.delete')}
                    className="rounded-sm p-1.5 text-subtle hover:bg-late-bg hover:text-late">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <PageHeader
        title={t('nav.receipts')}
        subtitle={data ? `${data.count}` : undefined}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      {removeReceipt.isError && (
        <Alert tone="error">{errorText(removeReceipt.error, t('receipts.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.readOnly ? t('receipts.view') : form.id ? t('receipts.edit') : t('receipts.new')}
               onClose={() => setForm(null)} size="xl">
          <form onSubmit={submit}>
            {saveReceipt.isError && (
              <Alert tone="error">{errorText(saveReceipt.error, t('common.error'))}</Alert>
            )}
            {form.readOnly && (
              <Alert tone="info">{t('receipts.readOnlyNotice')}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('table.supplier')} required>
                <Select value={form.supplier} required disabled={form.readOnly}
                        onChange={(e) => setForm({ ...form, supplier: e.target.value, order: '', line_items: [] })}>
                  <option value="">—</option>
                  {suppliers?.results?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('receipts.order')} help={t('receipts.orderHelp')}>
                <Select value={form.order} disabled={!form.supplier || form.readOnly}
                        onChange={(e) => onOrderChange(e.target.value)}>
                  <option value="">—</option>
                  {openOrders.map((o) => (
                    <option key={o.id} value={o.id}>{o.number}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('receipts.warehouse')} required>
                <Select value={form.warehouse} required disabled={form.readOnly}
                        onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                  <option value="">—</option>
                  {warehouses?.results?.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('receipts.receivedOn')}>
                <Input type="date" value={form.received_on} disabled={form.readOnly}
                       onChange={(e) => setForm({ ...form, received_on: e.target.value })} />
              </Field>
              <Field label={t('receipts.location')}>
                <Input value={form.location} disabled={form.readOnly}
                       onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
            </div>

            <h4 className="mb-2 mt-3 text-sm font-semibold">{t('purchaseOrders.lines')}</h4>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full border-collapse text-[0.8125rem]">
                <thead>
                  <tr>
                    <th className="th min-w-[180px]">{t('table.name')}</th>
                    <th className="th min-w-[90px] text-end">{t('receipts.orderedQty')}</th>
                    <th className="th min-w-[90px] text-end">{t('receipts.receivedQty')}</th>
                    <th className="th min-w-[110px] text-end">{t('table.price')}</th>
                    <th className="th min-w-[130px] text-end">{t('table.amount')}</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map((line, idx) => (
                    <tr key={idx}>
                      <td className="td min-w-[180px]">
                        <Select value={line.product} disabled={!!form.order || form.readOnly}
                                onChange={(e) => onProductChange(idx, e.target.value)}>
                          <option value="">—</option>
                          {products?.results?.map((p) => (
                            <option key={p.id} value={p.id}>{p.code} — {p.designation}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="td-num min-w-[90px] data">{line.ordered_quantity || '—'}</td>
                      <td className="td-num min-w-[90px]">
                        <Input type="number" step="0.01" min="0" value={line.quantity} disabled={form.readOnly}
                               onChange={(e) => setReceivedQty(idx, e.target.value)} />
                      </td>
                      <td className="td-num min-w-[110px]">
                        <Input type="number" step="0.01" min="0" value={line.unit_price} disabled={form.readOnly}
                               onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                      </td>
                      <td className="td-num min-w-[130px] data">{money(lineAmount(line))}</td>
                      <td className="td">
                        {!form.readOnly && (
                          <button type="button" onClick={() => removeLine(idx)}
                                  aria-label={t('common.delete')}
                                  className="rounded-sm p-1.5 text-subtle hover:bg-late-bg hover:text-late">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {!form.readOnly && (
                <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addLine}>
                  {t('purchaseOrders.addLine')}
                </Button>
              )}
              <span className="text-sm font-semibold">
                {t('table.amount')} : <span className="data">{money(receiptTotal)}</span>
              </span>
            </div>

            <div className="mt-4">
              <Field label={t('partners.notes')}>
                <Textarea value={form.notes} disabled={form.readOnly}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>

            {importError && <Alert tone="warn">{importError}</Alert>}
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                   onChange={handleImportFile} />

            <div className="mt-2 flex gap-2">
              {!form.readOnly && (
                <Button type="submit" disabled={saveReceipt.isPending}>
                  {t('common.save')}
                </Button>
              )}
              {!form.readOnly && (
                <Button type="button" variant="secondary" icon={Upload} onClick={handleImportClick}>
                  {t('receipts.importCsv')}
                </Button>
              )}
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
