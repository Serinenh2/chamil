import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, Button, DataTable, Input } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/context/AuthContext'

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { number } = useFormat()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useList('suppliers', { search, page_size: 25 })

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
  ]

  return (
    <>
      <PageHeader
        title={t('nav.suppliers')}
        subtitle={data ? `${data.count} ${t('common.total').toLowerCase()}` : undefined}
        actions={can('admin', 'buyer') && <Button icon={Plus}>{t('common.new')}</Button>}
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t('common.search')} value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
