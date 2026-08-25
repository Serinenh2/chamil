import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui'

/** Téléversement / suppression d'une image (logo, cachet, signature) — section 39.4. */
export default function ImageUploader({ label, imageUrl, onUpload, onDelete, hint }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await onUpload(file)
    } catch {
      setError(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch {
      setError(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden
                        rounded-md border border-line-strong bg-sunken">
          {imageUrl
            ? <img src={imageUrl} alt={label} className="h-full w-full object-contain" />
            : <span className="text-[0.65rem] text-subtle">—</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon={Upload} disabled={busy}
                  onClick={() => inputRef.current?.click()}>
            {imageUrl ? t('common.change') : t('common.upload')}
          </Button>
          {imageUrl && (
            <Button type="button" size="sm" variant="secondary" icon={Trash2} disabled={busy}
                    onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-late">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  )
}
