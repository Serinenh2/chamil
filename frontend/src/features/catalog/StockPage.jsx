import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useEndpoint, useList, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, DataTable, Field, Input, Kpi, Modal, Select, Tabs, Textarea } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'

const STOCK_TONE = { ok: 'ok', low: 'pending', out: 'overdue', over: 'processing' }

const MOVEMENT_TYPES = [
  ['in', 'Entrée'], ['out', 'Sortie'], ['adjust', 'Ajustement'],
  ['return_in', 'Retour client'], ['return_out', 'Retour fournisseur'],
]

const EMPTY_FORM = { product: '', warehouse: '', movement_type: 'adjust', quantity: 0, unit_cost: 0, reference: '', note: '' }

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().filter((v) => typeof v === 'string')
    .join(' ') || fallback
}

export default function StockPage() {
  const { t } = useTranslation()
  const { money, number, date } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'stock')
  const [tab, setTab] = useState('items')
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [form, setForm] = useState(null)

  const { data: valuation } = useEndpoint('/stock-items/valuation/')
  const { data: alerts } = useEndpoint('/stock-items/alerts/')
  const { data: items, isLoading: loadingItems, error: itemsError } = useList(
    'stock-items', { search, warehouse: warehouseFilter || undefined, page_size: 50 },
  )
  const { data: movements, isLoading: loadingMovements, error: movementsError } = useList(
    'stock-movements', { page_size: 50 }, { enabled: tab === 'movements' },
  )
  const { data: warehouses } = useList('warehouses', { page_size: 100 })
  const { data: products } = useList('products', { page_size: 200 }, { enabled: !!form })
  const saveMovement = useSave('stock-movements')

  const openCreate = () => {
    saveMovement.reset()
    setForm({ ...EMPTY_FORM })
  }

  const submit = (e) => {
    e.preventDefault()
    saveMovement.mutate(form, { onSuccess: () => setForm(null) })
  }

  const itemColumns = [
    { key: 'product_code', label: t('table.code'), render: (r) => <span className="data">{r.product_code}</span> },
    { key: 'product_label', label: t('table.name') },
    { key: 'warehouse_name', label: t('receipts.warehouse') },
    { key: 'quantity', label: t('table.quantity'), align: 'num', render: (r) => number(r.quantity) },
    { key: 'value', label: t('stock.value'), align: 'num', render: (r) => money(r.value) },
    { key: 'status', label: t('table.status'),
      render: (r) => <Badge status={STOCK_TONE[r.status] || 'draft'}>{r.status}</Badge> },
  ]

  const movementColumns = [
    { key: 'moved_at', label: t('table.date'), render: (r) => date(r.moved_at) },
    { key: 'product_label', label: t('table.name') },
    { key: 'warehouse', label: t('receipts.warehouse'),
      render: (r) => warehouses?.results?.find((w) => w.id === r.warehouse)?.name || '—' },
    { key: 'type_label', label: t('stock.movementType') },
    { key: 'quantity', label: t('table.quantity'), align: 'num', render: (r) => number(r.quantity) },
    { key: 'unit_cost', label: t('stock.unitCost'), align: 'num', render: (r) => money(r.unit_cost) },
    { key: 'reference', label: t('supplierPayments.reference'),
      render: (r) => <span className="data">{r.reference || '—'}</span> },
  ]

  return (
    <>
      <PageHeader
        title={t('nav.stock')}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('stock.newMovement')}</Button>}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Kpi label={t('dashboard.stockValue')} value={money(valuation?.stock_value)} accent="primary" />
        <Kpi label={t('stock.lines')} value={number(valuation?.lines)} accent="ok" />
        <Kpi label={t('stock.lowOrOut')} value={number(alerts?.count)} accent="late"
             deltaTone={alerts?.count ? 'late' : 'muted'} />
      </div>

      <Tabs tabs={[
        { key: 'items', label: t('stock.currentStock') },
        { key: 'movements', label: t('stock.movements') },
      ]} active={tab} onChange={setTab} />

      {tab === 'items' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="max-w-sm flex-1">
              <Input placeholder={t('common.search')} value={search}
                     onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-w-xs flex-1">
              <Select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                <option value="">{t('stock.allWarehouses')}</option>
                {warehouses?.results?.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <DataTable columns={itemColumns} rows={items?.results} loading={loadingItems} error={itemsError} />
        </>
      )}

      {tab === 'movements' && (
        <DataTable columns={movementColumns} rows={movements?.results}
                   loading={loadingMovements} error={movementsError} />
      )}

      {form && (
        <Modal title={t('stock.newMovement')} onClose={() => setForm(null)}>
          <form onSubmit={submit}>
            {saveMovement.isError && (
              <Alert tone="error">{errorText(saveMovement.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('table.name')} required>
                <Select value={form.product} required
                        onChange={(e) => setForm({ ...form, product: e.target.value })}>
                  <option value="">—</option>
                  {products?.results?.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.designation}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('receipts.warehouse')} required>
                <Select value={form.warehouse} required
                        onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                  <option value="">—</option>
                  {warehouses?.results?.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('stock.movementType')}>
                <Select value={form.movement_type}
                        onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                  {MOVEMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('table.quantity')} required>
                <Input type="number" step="0.01" min="0.01" value={form.quantity} required
                       onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Field>
              <Field label={t('stock.unitCost')}>
                <Input type="number" step="0.01" min="0" value={form.unit_cost}
                       onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
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

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={saveMovement.isPending}>
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
