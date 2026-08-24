import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, DataTable } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

const TONE = { draft: 'draft', pending: 'pending', validated: 'ok', refused: 'overdue' }

export default function QuotesPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { data, isLoading, error } = useList('quotes', { page_size: 25 })

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'customer_name', label: t('table.customer') },
    { key: 'amount_ttc', label: t('table.amount'), align: 'num', render: (r) => money(r.amount_ttc) },
    { key: 'valid_until', label: t('table.due'), align: 'num', render: (r) => date(r.valid_until) },
    { key: 'status', label: t('table.status'),
      render: (r) => <Badge status={TONE[r.status] || 'draft'}>{r.status_label}</Badge> },
  ]

  return (
    <>
      <PageHeader title={t('nav.quotes')} />
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
