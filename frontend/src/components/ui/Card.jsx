export default function Card({ title, action, children, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}
