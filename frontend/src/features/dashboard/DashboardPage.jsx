import { useTranslation } from 'react-i18next'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useEndpoint } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Card, Kpi, Spinner, Stepper } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { money, number } = useFormat()
  const { data: global, isLoading } = useEndpoint('/dashboard/global/')
  const { data: sales } = useEndpoint('/dashboard/sales/')
  const { data: trend } = useEndpoint('/dashboard/trend/', { months: 6 })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>
  }

  return (
    <>
      <PageHeader title={t('dashboard.title')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t('dashboard.revenueMonth')}
             value={money(sales?.revenue_month)} accent="primary" />
        <Kpi label={t('dashboard.receivables')}
             value={money(global?.sales?.receivables)} accent="wait" />
        <Kpi label={t('dashboard.unpaid')}
             value={number(sales?.unpaid_invoices)} accent="late"
             delta={`${global?.alerts?.critical ?? 0} ${t('urgency.critical').toLowerCase()}`}
             deltaTone="late" />
        <Kpi label={t('dashboard.stockValue')}
             value={money(global?.stock?.value)} accent="ok"
             delta={`${global?.stock?.out_of_stock ?? 0} / ${global?.stock?.low_stock ?? 0}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t('dashboard.trend')} className="lg:col-span-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} width={72} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                  borderRadius: 10, color: 'var(--text-primary)' }}
                />
                <Legend />
                <Bar dataKey="purchases" name={t('dashboard.purchases')} fill="#DCE9FA" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sales" name={t('dashboard.salesLabel')} fill="#1B5CB4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

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
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('dashboard.purchases')}>
          <Stepper current={3}
                   steps={['Demande', 'Consultation', 'Offre', 'Commande', 'Réception', 'Facture', 'Paiement']} />
        </Card>
        <Card title={t('dashboard.salesLabel')}>
          <Stepper current={4}
                   steps={['Prospect', 'Devis', 'Commande', 'Préparation', 'Livraison', 'Facture', 'Paiement']} />
        </Card>
      </div>
    </>
  )
}
