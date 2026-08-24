/**
 * Pastille d'état commercial. La sémantique remplace celle de MRAFIQ :
 * validé/payé/livré, en attente/partiel, impayé/en retard, brouillon, en traitement.
 */
const STATUS_STYLES = {
  ok: 'text-ok bg-ok-bg', paid: 'text-ok bg-ok-bg', validated: 'text-ok bg-ok-bg',
  completed: 'text-ok bg-ok-bg',
  pending: 'text-wait bg-wait-bg', partial: 'text-wait bg-wait-bg',
  overdue: 'text-late bg-late-bg', refused: 'text-late bg-late-bg', out: 'text-late bg-late-bg',
  draft: 'text-draft bg-draft-bg', cancelled: 'text-draft bg-draft-bg',
  processing: 'text-proc bg-proc-bg',
}

const URGENCY_STYLES = {
  critical: 'bg-critical text-white', high: 'bg-high text-white',
  medium: 'bg-medium text-white', low: 'bg-low text-white',
}

export default function Badge({ status = 'draft', urgency, children, className = '' }) {
  if (urgency) {
    return (
      <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs
                        font-semibold ${URGENCY_STYLES[urgency] || URGENCY_STYLES.low} ${className}`}>
        {children}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-0.5 text-xs
                      font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.draft} ${className}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current" />
      {children}
    </span>
  )
}
