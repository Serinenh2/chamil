import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import SearchPage from '@/features/dashboard/SearchPage'
import StatsPage from '@/features/dashboard/StatsPage'
import SuppliersPage from '@/features/partners/SuppliersPage'
import CustomersPage from '@/features/partners/CustomersPage'
import ProductsPage from '@/features/catalog/ProductsPage'
import StockPage from '@/features/catalog/StockPage'
import PurchaseOrdersPage from '@/features/purchasing/PurchaseOrdersPage'
import SupplierPaymentsPage from '@/features/purchasing/SupplierPaymentsPage'
import ReceiptsPage from '@/features/purchasing/ReceiptsPage'
import DocumentsPage from '@/features/sales/DocumentsPage'
import CustomerPaymentsPage from '@/features/sales/CustomerPaymentsPage'
import AlertsPage from '@/features/alerts/AlertsPage'
import ProfilePage from '@/features/profile/ProfilePage'

/** Route protégée : authentification obligatoire, rôles optionnels. */
function Protected({ roles, children }) {
  const { user, loading, can } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size={32} /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !can(...roles)) return <Navigate to="/" replace />
  return children
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <Protected><AppLayout /></Protected>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'recherche', element: <SearchPage /> },
      { path: 'statistiques', element: <StatsPage /> },
      { path: 'fournisseurs', element: <Protected roles={['admin', 'buyer', 'accountant']}><SuppliersPage /></Protected> },
      { path: 'commandes-fournisseurs', element: <Protected roles={['admin', 'buyer']}><PurchaseOrdersPage /></Protected> },
      { path: 'receptions', element: <Protected roles={['admin', 'buyer', 'stock']}><ReceiptsPage /></Protected> },
      { path: 'reglements-fournisseurs', element: <Protected roles={['admin', 'buyer', 'accountant', 'stock']}><SupplierPaymentsPage /></Protected> },
      { path: 'clients', element: <Protected roles={['admin', 'sales', 'accountant']}><CustomersPage /></Protected> },
      { path: 'documents', element: <Protected roles={['admin', 'sales', 'accountant', 'stock']}><DocumentsPage /></Protected> },
      { path: 'reglements', element: <Protected roles={['admin', 'sales', 'accountant']}><CustomerPaymentsPage /></Protected> },
      { path: 'produits', element: <ProductsPage /> },
      { path: 'stock', element: <StockPage /> },
      { path: 'alertes', element: <AlertsPage /> },
      { path: 'profil', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
