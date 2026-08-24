const ACCENTS = {
  primary: 'bg-primary-600', ok: 'bg-ok', wait: 'bg-wait', late: 'bg-late',
}

export default function Kpi({ label, value, delta, deltaTone = 'muted', accent = 'primary' }) {
  const tone = { ok: 'text-ok', late: 'text-late', wait: 'text-wait', muted: 'text-subtle' }[deltaTone]
  return (
    <article className="card relative overflow-hidden">
      <span className={`absolute inset-y-0 start-0 w-1 ${ACCENTS[accent]}`} />
      <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
      <p className="data mt-1 text-[1.875rem] font-bold leading-none">{value}</p>
      {delta && <p className={`mt-2 text-xs font-semibold ${tone}`}>{delta}</p>}
    </article>
  )
}
