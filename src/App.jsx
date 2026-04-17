import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './layouts/MainLayout'
import Login from './pages/auth/Login'
import UserList from './pages/admin/users/UserList'
import UserCreate from './pages/admin/users/UserCreate'
import UserEdit from './pages/admin/users/UserEdit'
import UserLevels from './pages/admin/users/UserLevels'
import Dashboard from './pages/Dashboard'
import PrivilegeList from './pages/admin/privileges/PrivilegeList'
import ItemsHub from './pages/items/ItemsHub'
import UserAccess from './pages/admin/users/UserAccess'
import UserActivity from './pages/admin/users/UserActivity'
import UserActivityView from './pages/admin/users/UserActivityView'
import BackupManagement from './pages/admin/BackupManagement'
import EventList from './pages/events/EventList'
import ActiveSalesReps from './pages/sales/ActiveSalesReps'
import InactiveSalesReps from './pages/sales/InactiveSalesReps'
import CreateSalesRep from './pages/sales/CreateSalesRep'
import ViewSalesRep from './pages/sales/ViewSalesRep'
import ViewCustomer from './pages/customers/ViewCustomer'
import ActiveCustomers from './pages/customers/ActiveCustomers'
import InactiveCustomers from './pages/customers/InactiveCustomers'
import SupplierList from './pages/customers/SupplierList'
import ViewSupplier from './pages/customers/ViewSupplier'
import PilotCustomers from './pages/customers/PilotCustomers'
import CustomerTypes from './pages/customers/CustomerTypes'
import CustomerImportExport from './pages/customers/CustomerImportExport'
import ItemSizesView from './pages/items/ItemSizesView'
import AirfeetPoList from './pages/airfeetpo/AirfeetPoList'
import InvoiceList from './pages/invoices/InvoiceList'
import OutstandingInvoices from './pages/invoices/OutstandingInvoices'
import OutstandEmails from './pages/invoices/OutstandEmails'
import CommissionList from './pages/commissions/CommissionList'
import CommissionReport from './pages/commissions/CommissionReport'
import Reports from './pages/reports/Reports'
import CustomerReports from './pages/customers/CustomerReports'
import SalesRepReports from './pages/sales/SalesRepReports'
import InvoiceReports from './pages/invoices/InvoiceReports'
import PilotProgramList from './pages/pilot/PilotProgramList'
import DefaultAccess from './pages/admin/users/DefaultAccess'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('ct_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setChecking(false)
  }, [])

  function handleLogin(userData) {
    setUser(userData)
  }

  function handleLogout() {
    localStorage.removeItem('ct_user')
    setUser(null)
  }

  if (checking) return null

  return (
    <>
      <Toaster position="bottom-right" />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route element={user ? <MainLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<UserList />} />
          <Route path="/admin/users/create" element={<UserCreate />} />
          <Route path="/admin/users/:id/edit" element={<UserEdit />} />
          <Route path="/admin/levels" element={<UserLevels />} />
          <Route path="/admin/privileges" element={<PrivilegeList />} />
          <Route path="/admin/access" element={<UserAccess />} />
          <Route path="/admin/activity" element={<UserActivity />} />
          <Route path="/admin/activity/:id" element={<UserActivityView />} />
          <Route path="/admin/backup" element={<BackupManagement />} />
          <Route path="/admin/default-access" element={<DefaultAccess />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/items" element={<ItemsHub />} />
          <Route path="/items/sizes/:id" element={<ItemSizesView />} />
          <Route path="/sales-reps/active" element={<ActiveSalesReps />} />
          <Route path="/sales-reps/inactive" element={<InactiveSalesReps />} />
          <Route path="/sales-reps/create" element={<CreateSalesRep />} />
          <Route path="/sales-reps/:id/edit" element={<CreateSalesRep />} />
          <Route path="/sales-reps/:id" element={<ViewSalesRep />} />
          <Route path="/airfeet-po" element={<AirfeetPoList />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/outstanding" element={<OutstandingInvoices />} />
          <Route path="/invoices/outstand-emails" element={<OutstandEmails />} />
          <Route path="/commissions" element={<CommissionList />} />
          <Route path="/commissions/report" element={<CommissionReport />} />
          <Route path="/pilot-programs" element={<PilotProgramList />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/customers/reports" element={<CustomerReports />} />
          <Route path="/sales-reps/reports" element={<SalesRepReports />} />
          <Route path="/invoices/reports" element={<InvoiceReports />} />
          <Route path="/customers/active" element={<ActiveCustomers />} />
          <Route path="/customers/inactive" element={<InactiveCustomers />} />
          <Route path="/customers/suppliers" element={<SupplierList />} />
          <Route path="/customers/suppliers/:id" element={<ViewSupplier />} />
          <Route path="/customers/pilot" element={<PilotCustomers />} />
          <Route path="/customers/types" element={<CustomerTypes />} />
          <Route path="/customers/import-export" element={<CustomerImportExport />} />
          <Route path="/customers/:id" element={<ViewCustomer />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default App
