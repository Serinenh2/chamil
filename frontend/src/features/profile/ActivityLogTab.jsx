import { useTranslation } from 'react-i18next'
import { useList } from '@/hooks/useResource'
import { useFormat } from '@/hooks/useFormat'
import { DataTable } from '@/components/ui'

/** Journal d'activité — section 35, réservé au dirigeant et à l'administrateur. */
export default function ActivityLogTab() {
  const { t } = useTranslation()
  const { dateTime } = useFormat()
  const { data, isLoading, error } = useList('audit-logs', { page_size: 50 })

  const columns = [
    { key: 'created_at', label: t('table.date'), align: 'num',
      render: (r) => dateTime(r.created_at) },
    { key: 'user_name', label: t('nav.users'), render: (r) => r.user_name || '—' },
    { key: 'action_label', label: t('common.actions') },
    { key: 'model_name', label: t('table.name'),
      render: (r) => <span className="data">{r.model_name}{r.object_id ? ` #${r.object_id}` : ''}</span> },
    { key: 'ip_address', label: 'IP', render: (r) => <span className="data">{r.ip_address || '—'}</span> },
  ]

  return <DataTable columns={columns} rows={data?.results} loading={isLoading} error={error} />
}
