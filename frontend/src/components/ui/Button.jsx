const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-px',
  secondary: 'bg-surface text-content border border-line-strong hover:border-primary-600 hover:text-primary-600',
  ghost: 'bg-transparent text-primary-600 hover:bg-primary-50',
  danger: 'bg-late text-white hover:opacity-90',
}
const SIZES = {
  sm: 'px-3 py-1.5 text-[0.8125rem] rounded-sm',
  md: 'px-[18px] py-2.5 text-sm rounded-md',
  lg: 'px-6 py-3 text-[0.9375rem] rounded-md',
}

export default function Button({
  variant = 'primary', size = 'md', icon: Icon, children, className = '', ...props
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-semibold border border-transparent
                  transition-all duration-150 ease-chamil disabled:opacity-45
                  disabled:cursor-not-allowed disabled:transform-none
                  ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
    </button>
  )
}
