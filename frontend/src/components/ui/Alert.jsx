import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const TONES = {
  info: { cls: 'bg-primary-50 border-primary-600/30 text-content', Icon: Info },
  warn: { cls: 'bg-wait-bg border-wait/40 text-content', Icon: AlertTriangle },
  error: { cls: 'bg-late-bg border-late/40 text-content', Icon: XCircle },
  success: { cls: 'bg-ok-bg border-ok/40 text-content', Icon: CheckCircle2 },
}

export default function Alert({ tone = 'info', title, children, action }) {
  const { cls, Icon } = TONES[tone] || TONES.info
  return (
    <div className={`mb-3 flex gap-3 rounded-md border p-3.5 text-[0.8125rem] ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {title && <b className="block">{title}</b>}
        {children}
      </div>
      {action}
    </div>
  )
}
