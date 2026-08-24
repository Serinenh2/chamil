import { useCallback } from 'react'
import { useUi } from '@/context/UiContext'

/**
 * Formatage des montants et des dates.
 * Règle du design system : les nombres restent en chiffres latins et en
 * direction LTR, même lorsque l'interface est en arabe.
 */
export function useFormat() {
  const { lang } = useUi()

  const money = useCallback((value, currency = 'DA') => {
    const n = Number(value || 0)
    return `${n.toLocaleString('fr-DZ', { minimumFractionDigits: 2,
      maximumFractionDigits: 2 })} ${currency}`
  }, [])

  const number = useCallback((value) => Number(value || 0).toLocaleString('fr-DZ'), [])

  const date = useCallback((value) => {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10)
  }, [])

  const dateTime = useCallback((value) => {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '—' : `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`
  }, [])

  return { money, number, date, dateTime, lang }
}
