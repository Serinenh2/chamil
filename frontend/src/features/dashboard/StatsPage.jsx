import { useTranslation } from 'react-i18next'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Card, DataTable, Kpi, Spinner } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

export default function StatsPage() {
  const { t } = useTranslation()
  const { money, number } = useFormat()
  const { data: purchasing, isLoading: loadingPurchasing } = useEndpoint('/dashboard/purchasing/')
  const { data: sales, isLoading: loadingSales } = useEndpoint('/dashboard/sales/')
  const { data: profitability, isLoading: loadingProfitability } = useEndpoint('/dashboard/profitability/')

  if (loadingPurchasing || loadingSales || loadingProfitability) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  const marginColumns = [
    { key: 'product', label: t('table.name') },
    { key: 'quantity', label: t('table.quantity'), align: 'num', render: (r) => number(r.quantity) },
    { key: 'revenue', label: t('stats.revenue'), align: 'num', render: (r) => money(r.revenue) },
    { key: 'cost', label: t('stats.cost'), align: 'num', render: (r) => money(r.cost) },
    { key: 'margin', label: t('stats.margin'), align: 'num', render: (r) => money(r.margin) },
    { key: 'margin_rate', label: t('stats.marginRate'), align: 'num',
      render: (r) => `${number(r.margin_rate)} %` },
  ]

  return (
    <>
      <PageHeader title={t('nav.stats')} />

      <h3 className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted">
        {t('dashboard.purchases')}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t('stats.purchasesMonth')} value={money(purchasing?.purchases_month)} accent="primary" />
        <Kpi label={t('stats.purchasesYear')} value={money(purchasing?.purchases_year)} accent="primary" />
        <Kpi label={t('stats.activeSuppliers')} value={number(purchasing?.active_suppliers)} accent="ok" />
        <Kpi label={t('stats.supplierDebt')} value={money(purchasing?.supplier_debt)} accent="late" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Kpi label={t('stats.openOrders')} value={number(purchasing?.open_orders)} accent="wait" />
        <Kpi label={t('stats.lateOrders')} value={number(purchasing?.late_orders)} accent="late"
             deltaTone={purchasing?.late_orders ? 'late' : 'muted'} />
        <Kpi label={t('stats.supplierInvoices')} value={number(purchasing?.supplier_invoices)} accent="primary" />
      </div>
      <div className="mt-4">
        <Card title={t('stats.topSuppliers')}>
          <ul className="space-y-3">
            {(purchasing?.top_suppliers || []).map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="data shrink-0 font-semibold">{money(row.total)}</span>
              </li>
            ))}
            {!purchasing?.top_suppliers?.length && (
              <li className="text-sm text-subtle">{t('common.empty')}</li>
            )}
          </ul>
        </Card>
      </div>

      <h3 className="mb-2 mt-8 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted">
        {t('dashboard.salesLabel')}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t('stats.revenueMonth')} value={money(sales?.revenue_month)} accent="primary" />
        <Kpi label={t('stats.revenueYear')} value={money(sales?.revenue_year)} accent="primary" />
        <Kpi label={t('stats.newCustomers')} value={number(sales?.new_customers)} accent="ok" />
        <Kpi label={t('dashboard.receivables')} value={money(sales?.receivables)} accent="late" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Kpi label={t('stats.pendingQuotes')} value={number(sales?.pending_quotes)} accent="wait" />
        <Kpi label={t('stats.openOrders')} value={number(sales?.open_orders)} accent="wait" />
        <Kpi label={t('stats.unpaidInvoices')} value={number(sales?.unpaid_invoices)} accent="late"
             deltaTone={sales?.unpaid_invoices ? 'late' : 'muted'} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('dashboard.topCustomers')}>
          <ul className="space-y-3">
            {(sales?.top_customers || []).map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="data shrink-0 font-semibold">{money(row.total)}</span>
              </li>
            ))}
            {!sales?.top_customers?.length && (
              <li className="text-sm text-subtle">{t('common.empty')}</li>
            )}
          </ul>
        </Card>
        <Card title={t('dashboard.topProducts')}>
          <ul className="space-y-3">
            {(sales?.top_products || []).map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="data shrink-0 font-semibold">{money(row.revenue)}</span>
              </li>
            ))}
            {!sales?.top_products?.length && (
              <li className="text-sm text-subtle">{t('common.empty')}</li>
            )}
          </ul>
        </Card>
      </div>

      <h3 className="mb-2 mt-8 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted">
        {t('stats.profitability')}
      </h3>
      <DataTable columns={marginColumns} rows={profitability} />
    </>
  )
}
