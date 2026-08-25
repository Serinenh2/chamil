import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle, Boxes, FileText, LayoutDashboard, Package, ShoppingCart,
  TrendingUp, Truck, UserCircle, Users, Wallet,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/** Trois sections métier, huit entrées visibles au maximum (règle du design system). */
const SECTIONS = [
  {
    key: 'pilotage',
    items: [
      { to: '/', key: 'dashboard', Icon: LayoutDashboard, end: true },
      { to: '/statistiques', key: 'stats', Icon: TrendingUp },
    ],
  },
  {
    key: 'purchasing',
    roles: ['admin', 'buyer', 'accountant', 'stock'],
    items: [
      { to: '/fournisseurs', key: 'suppliers', Icon: Users },
      { to: '/commandes-fournisseurs', key: 'purchaseOrders', Icon: ShoppingCart },
      { to: '/receptions', key: 'receipts', Icon: Truck },
    ],
  },
  {
    key: 'sales',
    roles: ['admin', 'sales', 'accountant', 'stock'],
    items: [
      { to: '/clients', key: 'customers', Icon: Users },
      { to: '/documents', key: 'documents', Icon: FileText },
      { to: '/reglements', key: 'payments', Icon: Wallet },
    ],
  },
  {
    key: 'resources',
    items: [
      { to: '/produits', key: 'products', Icon: Package },
      { to: '/stock', key: 'stock', Icon: Boxes },
      { to: '/alertes', key: 'alerts', Icon: AlertTriangle },
      { to: '/profil', key: 'profile', Icon: UserCircle },
    ],
  },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const { can } = useAuth()

  return (
    <nav
      aria-label={t('nav.pilotage')}
      className="hidden w-[250px] shrink-0 overflow-y-auto bg-sidebar px-3 py-5
                 text-[#B9C7DB] lg:block"
    >
      <div className="mb-6 flex items-baseline gap-2.5 px-3">
        <span className="font-arabic text-[1.55rem] font-bold text-white">شـامل</span>
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-brass-300">
          Chamil
        </span>
      </div>

      {SECTIONS.filter((s) => !s.roles || can(...s.roles)).map((section) => (
        <div key={section.key}>
          <p className="px-3 pb-1.5 pt-3.5 text-[0.66rem] uppercase tracking-[0.14em] text-[#5F7396]">
            {t(`nav.${section.key}`)}
          </p>
          {section.items.map(({ to, key, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors
                 ${isActive ? 'bg-primary-600 font-semibold text-white'
                            : 'hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={17} className="shrink-0" />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
