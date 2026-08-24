export function Field({ label, required, error, help, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="label">
          {label} {required && <span className="text-late">*</span>}
        </label>
      )}
      {children}
      {(error || help) && (
        <p className={`mt-1.5 text-xs ${error ? 'font-medium text-late' : 'text-subtle'}`}>
          {error || help}
        </p>
      )}
    </div>
  )
}

export function Input({ error, ...props }) {
  return <input className={`input ${error ? 'border-late' : ''}`} {...props} />
}

export function Select({ children, ...props }) {
  return <select className="input" {...props}>{children}</select>
}

export function Textarea(props) {
  return <textarea className="input min-h-[90px]" {...props} />
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="mb-3 inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="relative h-[21px] w-[38px] shrink-0 rounded-pill bg-line-strong
                       transition-colors peer-checked:bg-ok
                       after:absolute after:top-[3px] after:start-[3px] after:h-[15px]
                       after:w-[15px] after:rounded-full after:bg-white after:transition-transform
                       peer-checked:after:translate-x-[17px] rtl:peer-checked:after:-translate-x-[17px]" />
      {label}
    </label>
  )
}

export function KeyValue({ label, value, mono }) {
  return (
    <div>
      <dt className="text-[0.72rem] uppercase tracking-wider text-subtle">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium ${mono ? 'data' : ''}`}>{value || '—'}</dd>
    </div>
  )
}
