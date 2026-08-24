export default function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" className="mb-4 flex gap-0.5 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold
                      transition-colors
                      ${active === tab.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-muted hover:text-content'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
