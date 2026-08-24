/**
 * Indicateur d'étapes des workflows commerciaux.
 * Achats : Demande → Consultation → Offre → Commande → Réception → Facture → Paiement
 * Ventes : Prospect → Devis → Commande → Préparation → Livraison → Facture → Paiement
 */
export default function Stepper({ steps, current = 0 }) {
  return (
    <ol className="flex items-start overflow-x-auto py-2">
      {steps.map((label, index) => {
        const done = index < current
        const now = index === current
        return (
          <li key={label} className="relative min-w-[96px] flex-1 text-center text-[0.72rem]">
            {index < steps.length - 1 && (
              <span className={`absolute top-[13px] start-1/2 h-0.5 w-full
                                ${done ? 'bg-ok' : 'bg-line-strong'}`} />
            )}
            <span
              className={`relative z-10 mx-auto mb-2 flex h-[26px] w-[26px] items-center
                          justify-center rounded-full border-2 text-[0.7rem] font-bold
                          ${done ? 'border-ok bg-ok text-white'
                            : now ? 'border-primary-600 bg-surface text-primary-600 ring-4 ring-primary-600/20'
                            : 'border-line-strong bg-surface text-subtle'}`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={now ? 'font-bold text-primary-600'
                                 : done ? 'text-muted' : 'text-subtle'}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
