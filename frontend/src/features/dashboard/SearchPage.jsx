import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEndpoint } from '@/hooks/useResource'
import { EmptyState, Spinner } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'

/** Recherche globale — section 34. */
export default function SearchPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const term = params.get('q') || ''
  const { data, isLoading } = useEndpoint('/search/', { q: term }, { enabled: term.length >= 2 })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>

  return (
    <>
      <PageHeader title={t('common.search')} subtitle={term} />
      {!data?.results?.length ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        <ul className="card divide-y divide-line p-0">
          {data.results.map((row) => (
            <li key={`${row.type}-${row.id}`} className="flex items-center gap-3 px-5 py-3">
              <span className="rounded-sm bg-sunken px-2 py-0.5 text-[0.68rem] uppercase
                               tracking-wider text-muted">{row.type}</span>
              <span className="text-sm">{row.label}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
