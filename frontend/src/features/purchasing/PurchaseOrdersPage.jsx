import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, DataTable } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

const TONE = { draft: 'draft', pending: 'pending', validated: 'ok',
               partial: 'pending', completed: 'ok', cancelled: 'cancelled' }

export default function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const { data, isLoading, error } = useList('purchase-orders', { page_size: 25 })

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'supplier_name', label: t('table.supplier') },
    { key: 'amount_ttc', label: t('table.amount'), align: 'num', render: (r) => money(r.amount_ttc) },
    { key: 'expected_on', label: t('table.due'), align: 'num',
      render: (r) => (
        <span className={r.is_late ? 'text-late font-semibold' : ''}>{date(r.expected_on)}</span>
      ) },
    { key: 'status', label: t('table.status'),
      render: (r) => <Badge status={TONE[r.status] || 'draft'}>{r.status_label}</Badge> },
  ]

  return (
    <>
      <PageHeader title={t('nav.purchaseOrders')} />
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
