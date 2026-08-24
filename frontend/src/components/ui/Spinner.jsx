export default function Spinner({ size = 24 }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-line-strong border-t-primary-600"
    />
  )
}
