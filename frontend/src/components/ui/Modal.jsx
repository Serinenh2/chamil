import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                    bg-black/50 p-4 pt-10 sm:pt-16"
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}
           onClick={(e) => e.stopPropagation()}>
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Fermer"
                  className="rounded-pill p-1.5 hover:bg-primary-50">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
