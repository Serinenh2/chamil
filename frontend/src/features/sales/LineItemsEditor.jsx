import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { useFormat } from '@/hooks/useFormat'

export function lineTotal(line) {
  const qty = Number(line.quantity) || 0
  const price = Number(line.unit_price) || 0
  const discount = Number(line.discount) || 0
  const vat = Number(line.vat_rate) || 0
  const net = qty * price * (1 - discount / 100)
  return net + (net * vat) / 100
}

export const EMPTY_LINE = { product: '', quantity: 1, unit_price: 0, discount: 0, vat_rate: 19 }

/**
 * Tableau de lignes de document (devis, commande, livraison, facture) — produit,
 * quantité, prix, remise, TVA — partagé par tous les formulaires du cycle ventes.
 * `priceField` choisit le prix produit utilisé au pré-remplissage (sale_price).
 */
export default function LineItemsEditor({ lines, products, priceField = 'sale_price', onChange }) {
  const { t } = useTranslation()
  const { money } = useFormat()

  const updateLine = (idx, patch) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  const addLine = () => onChange([...lines, { ...EMPTY_LINE }])
  const removeLine = (idx) => onChange(lines.filter((_, i) => i !== idx))
  const onProductChange = (idx, productId) => {
    const product = products?.find((p) => String(p.id) === String(productId))
    updateLine(idx, {
      product: productId,
      unit_price: product?.[priceField] ?? 0,
      vat_rate: product?.vat_rate ?? 19,
    })
  }

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr>
              <th className="th min-w-[180px]">{t('table.name')}</th>
              <th className="th min-w-[84px] text-end">{t('table.quantity')}</th>
              <th className="th min-w-[132px] text-end">{t('table.price')}</th>
              <th className="th min-w-[84px] text-end">{t('partners.discount')}</th>
              <th className="th min-w-[100px] text-end">TVA %</th>
              <th className="th min-w-[130px] text-end">{t('table.amount')}</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="td min-w-[180px]">
                  <Select value={line.product} onChange={(e) => onProductChange(idx, e.target.value)}>
                    <option value="">—</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.designation}</option>
                    ))}
                  </Select>
                </td>
                <td className="td-num min-w-[84px]">
                  <Input type="number" step="0.01" min="0" value={line.quantity}
                         onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                </td>
                <td className="td-num min-w-[132px]">
                  <Input type="number" step="0.01" min="0" value={line.unit_price}
                         onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                </td>
                <td className="td-num min-w-[84px]">
                  <Input type="number" step="0.01" min="0" value={line.discount}
                         onChange={(e) => updateLine(idx, { discount: e.target.value })} />
                </td>
                <td className="td-num min-w-[100px]">
                  <Input type="number" step="0.01" min="0" value={line.vat_rate}
                         onChange={(e) => updateLine(idx, { vat_rate: e.target.value })} />
                </td>
                <td className="td-num min-w-[130px] data">{money(lineTotal(line))}</td>
                <td className="td">
                  <button type="button" onClick={() => removeLine(idx)}
                          aria-label={t('common.delete')}
                          className="rounded-sm p-1.5 text-subtle hover:bg-late-bg hover:text-late">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addLine}>
          {t('purchaseOrders.addLine')}
        </Button>
        <span className="text-sm font-semibold">
          {t('table.amount')} : <span className="data">{money(total)}</span>
        </span>
      </div>
    </>
  )
}
