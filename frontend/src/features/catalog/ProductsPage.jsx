import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '@/services/api'
import { useList, useRemove, useSave } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, DataTable, Field, Input, Modal, Select, Switch, Textarea } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { UNITS } from '@/constants/choices'

const STOCK_TONE = { ok: 'ok', low: 'pending', out: 'overdue', over: 'processing' }

const EMPTY_FORM = {
  code: '', designation: '', designation_ar: '', description: '',
  category: '', brand: '', model: '', reference: '', unit: 'piece',
  purchase_price: 0, sale_price: 0, vat_rate: 19, min_stock: 0, max_stock: 0,
  warranty_months: 12, has_serial: false, is_active: true,
}

function errorText(error, fallback) {
  return Object.values(error?.response?.data || {}).flat().join(' ') || fallback
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const { money, number } = useFormat()
  const { can } = useAuth()
  const canWrite = can('admin', 'buyer', 'stock')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)

  const { data, isLoading, error } = useList('products', { search, page_size: 25 })
  const { data: categories } = useList('categories', { page_size: 200 }, { enabled: !!form })
  const { data: brands } = useList('brands', { page_size: 200 }, { enabled: !!form })
  const saveProduct = useSave('products')
  const removeProduct = useRemove('products')

  const openCreate = () => {
    saveProduct.reset()
    setForm({ ...EMPTY_FORM })
  }

  const openEdit = async (row) => {
    setLoadingEditId(row.id)
    try {
      const detail = await rest.get('products', row.id)
      saveProduct.reset()
      setForm({
        ...EMPTY_FORM, ...detail,
        category: detail.category || '', brand: detail.brand || '',
      })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDelete = (row) => {
    if (window.confirm(`${t('products.confirmDelete')} (${row.designation})`)) {
      removeProduct.mutate(row.id)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form, category: form.category || null, brand: form.brand || null }
    saveProduct.mutate(payload, { onSuccess: () => setForm(null) })
  }

  const columns = [
    { key: 'code', label: t('table.code'), render: (r) => <span className="data">{r.code}</span> },
    { key: 'designation', label: t('table.name'),
      render: (r) => (
        <div>
          <span className="font-semibold">{r.designation}</span>
          {r.brand_name && <span className="block text-[0.72rem] text-subtle">{r.brand_name}</span>}
        </div>
      ) },
    { key: 'purchase_price', label: 'Achat HT', align: 'num', render: (r) => money(r.purchase_price) },
    { key: 'sale_price', label: 'Vente HT', align: 'num', render: (r) => money(r.sale_price) },
    { key: 'stock_quantity', label: t('table.stock'), align: 'num',
      render: (r) => number(r.stock_quantity) },
    { key: 'stock_status', label: t('table.status'),
      render: (r) => <Badge status={STOCK_TONE[r.stock_status] || 'draft'}>{r.stock_status}</Badge> },
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
        title={t('nav.products')}
        subtitle={data ? `${data.count}` : undefined}
        actions={canWrite && <Button icon={Plus} onClick={openCreate}>{t('common.new')}</Button>}
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      {removeProduct.isError && (
        <Alert tone="error">{errorText(removeProduct.error, t('products.deleteError'))}</Alert>
      )}
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />

      {form && (
        <Modal title={form.id ? t('products.edit') : t('products.new')}
               onClose={() => setForm(null)} wide>
          <form onSubmit={submit}>
            {saveProduct.isError && (
              <Alert tone="error">{errorText(saveProduct.error, t('common.error'))}</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('table.code')} required>
                <Input value={form.code} required
                       onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </Field>
              <Field label={t('products.designation')} required>
                <Input value={form.designation} required
                       onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </Field>
              <Field label={t('products.designationAr')}>
                <Input dir="rtl" value={form.designation_ar}
                       onChange={(e) => setForm({ ...form, designation_ar: e.target.value })} />
              </Field>
              <Field label={t('products.category')}>
                <Select value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">—</option>
                  {categories?.results?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('products.brand')}>
                <Select value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                  <option value="">—</option>
                  {brands?.results?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('products.model')}>
                <Input value={form.model}
                       onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </Field>
              <Field label={t('products.reference')}>
                <Input value={form.reference}
                       onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
              <Field label={t('products.unit')}>
                <Select value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t('products.purchasePrice')}>
                <Input type="number" step="0.01" value={form.purchase_price}
                       onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              </Field>
              <Field label={t('products.salePrice')}>
                <Input type="number" step="0.01" value={form.sale_price}
                       onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
              </Field>
              <Field label={t('products.vat')}>
                <Input type="number" step="0.01" value={form.vat_rate}
                       onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} />
              </Field>
              <Field label={t('products.minStock')}>
                <Input type="number" step="0.01" value={form.min_stock}
                       onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              </Field>
              <Field label={t('products.maxStock')}>
                <Input type="number" step="0.01" value={form.max_stock}
                       onChange={(e) => setForm({ ...form, max_stock: e.target.value })} />
              </Field>
              <Field label={t('products.warranty')}>
                <Input type="number" value={form.warranty_months}
                       onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('products.description')}>
                  <Textarea value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
              </div>
            </div>

            <Switch checked={!!form.has_serial}
                    onChange={() => setForm({ ...form, has_serial: !form.has_serial })}
                    label={t('products.hasSerial')} />
            <Switch checked={!!form.is_active}
                    onChange={() => setForm({ ...form, is_active: !form.is_active })}
                    label={t('partners.active')} />

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={saveProduct.isPending}>
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
