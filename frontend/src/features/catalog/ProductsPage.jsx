import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, DataTable, Input } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

const STOCK_TONE = { ok: 'ok', low: 'pending', out: 'overdue', over: 'processing' }

export default function ProductsPage() {
  const { t } = useTranslation()
  const { money, number } = useFormat()
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useList('products', { search, page_size: 25 })

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
  ]

  return (
    <>
      <PageHeader title={t('nav.products')}
                  subtitle={data ? `${data.count}` : undefined} />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
