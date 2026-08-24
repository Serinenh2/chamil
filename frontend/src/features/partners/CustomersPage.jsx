import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, DataTable, Input } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

export default function CustomersPage() {
  const { t } = useTranslation()
  const { money } = useFormat()
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useList('customers', { search, page_size: 25 })

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
  ]

  return (
    <>
      <PageHeader title={t('nav.customers')} subtitle={data ? `${data.count}` : undefined} />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
