import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Badge, DataTable, Tabs } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

const STATUS_TONE = {
  paid: 'paid', partial: 'pending', pending: 'pending',
  overdue: 'overdue', draft: 'draft', cancelled: 'cancelled',
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const { money, date } = useFormat()
  const [tab, setTab] = useState('all')

  const params = { page_size: 25, ...(tab !== 'all' ? { status: tab } : {}) }
  const { data, isLoading, error } = useList('customer-invoices', params)

  const columns = [
    { key: 'number', label: t('table.number'),
      render: (r) => <span className="data font-semibold">{r.number}</span> },
    { key: 'customer_name', label: t('table.customer') },
    { key: 'amount_ttc', label: t('table.amount'), align: 'num',
      render: (r) => money(r.amount_ttc) },
    { key: 'balance', label: t('table.balance'), align: 'num',
      render: (r) => <span className={Number(r.balance) > 0 ? 'text-late' : 'text-ok'}>
        {money(r.balance)}</span> },
    { key: 'due_date', label: t('table.due'), align: 'num', render: (r) => date(r.due_date) },
    { key: 'status', label: t('table.status'),
      render: (r) => (
        <Badge status={STATUS_TONE[r.status] || 'draft'}>
          {r.status_label}
          {r.days_overdue > 0 && <span className="data ms-1">· {r.days_overdue} j</span>}
        </Badge>
      ) },
  ]

  return (
    <>
      <PageHeader title={t('nav.invoices')} />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: t('common.all') },
          { key: 'pending', label: t('status.pending') },
          { key: 'partial', label: t('status.partial') },
          { key: 'overdue', label: t('status.overdue') },
          { key: 'paid', label: t('status.paid') },
        ]}
      />
      <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
    </>
  )
}
