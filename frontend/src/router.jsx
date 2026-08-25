import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import SearchPage from '@/features/dashboard/SearchPage'
import SuppliersPage from '@/features/partners/SuppliersPage'
import CustomersPage from '@/features/partners/CustomersPage'
import ProductsPage from '@/features/catalog/ProductsPage'
import PurchaseOrdersPage from '@/features/purchasing/PurchaseOrdersPage'
import DocumentsPage from '@/features/sales/DocumentsPage'
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
      { path: 'fournisseurs', element: <Protected roles={['admin', 'buyer', 'accountant']}><SuppliersPage /></Protected> },
      { path: 'commandes-fournisseurs', element: <Protected roles={['admin', 'buyer']}><PurchaseOrdersPage /></Protected> },
      { path: 'clients', element: <Protected roles={['admin', 'sales', 'accountant']}><CustomersPage /></Protected> },
      { path: 'documents', element: <Protected roles={['admin', 'sales', 'accountant', 'stock']}><DocumentsPage /></Protected> },
      { path: 'produits', element: <ProductsPage /> },
      { path: 'alertes', element: <AlertsPage /> },
      { path: 'profil', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
