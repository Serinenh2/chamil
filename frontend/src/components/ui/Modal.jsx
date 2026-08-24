import { X } from 'lucide-react'

const SIZES = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ title, onClose, children, wide, size }) {
  const width = SIZES[size] || (wide ? SIZES.lg : SIZES.md)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                    bg-black/50 p-4 pt-10 sm:pt-16"
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className={`card w-full ${width}`}
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
