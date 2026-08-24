import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action, tone = 'neutral' }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-14 text-center">
      <Inbox size={32} className={tone === 'error' ? 'text-late' : 'text-subtle'} />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
