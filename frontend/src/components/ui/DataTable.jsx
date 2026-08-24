import { useTranslation } from 'react-i18next'
import Spinner from './Spinner'
import EmptyState from './EmptyState'

/**
 * Tableau de données générique : colonnes déclaratives, alignement automatique
 * des colonnes numériques (mono + LTR), état vide et état de chargement.
 *
 * columns: [{ key, label, align?: 'num', render?: (row) => node }]
 */
export default function DataTable({ columns, rows, loading, error, onRowClick, emptyLabel }) {
  const { t } = useTranslation()

  if (loading) return <div className="card flex justify-center py-12"><Spinner /></div>
  if (error) return <EmptyState title={t('common.error')} tone="error" />
  if (!rows?.length) return <EmptyState title={emptyLabel || t('common.empty')} />

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`th ${col.align === 'num' ? 'text-end' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors hover:bg-primary-50/60
                            ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'num' ? 'td-num' : 'td'}>
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
