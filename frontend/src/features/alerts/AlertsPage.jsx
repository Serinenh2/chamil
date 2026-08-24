import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAction, useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { Alert, Badge, Button, EmptyState, Spinner } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

const TONE_BY_SEVERITY = { critical: 'error', high: 'error', medium: 'warn', low: 'info' }

export default function AlertsPage() {
  const { t } = useTranslation()
  const { dateTime } = useFormat()
  const qc = useQueryClient()
  const { data, isLoading } = useList('alerts', { is_resolved: false, page_size: 50 })
  const action = useAction(['alerts', '/alerts/summary/'])

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>

  const rows = data?.results || []

  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        subtitle={`${data?.count ?? 0}`}
        actions={rows.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => action.mutate({ path: '/alerts/mark-all-read/' },
                                         { onSuccess: () => qc.invalidateQueries() })}
          >
            {t('alerts.markAllRead')}
          </Button>
        )}
      />

      {rows.length === 0 && <EmptyState title={t('alerts.none')} />}

      {rows.map((alert) => (
        <Alert
          key={alert.id}
          tone={TONE_BY_SEVERITY[alert.severity] || 'info'}
          title={alert.title}
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Badge urgency={alert.severity}>{t(`urgency.${alert.severity}`)}</Badge>
              <Button size="sm" variant="ghost"
                      onClick={() => action.mutate({ path: `/alerts/${alert.id}/resolve/` })}>
                {t('alerts.resolve')}
              </Button>
            </div>
          }
        >
          <span>{alert.message}</span>
          <span className="data ms-2 text-xs text-subtle">{dateTime(alert.created_at)}</span>
        </Alert>
      ))}
    </>
  )
}
