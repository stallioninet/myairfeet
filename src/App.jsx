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
import ActiveSalesReps from './pages/sales/ActiveSalesReps'
import InactiveSalesReps from './pages/sales/InactiveSalesReps'
import CreateSalesRep from './pages/sales/CreateSalesRep'
import ViewSalesRep from './pages/sales/ViewSalesRep'

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
          <Route path="/items" element={<ItemsHub />} />
          <Route path="/sales-reps/active" element={<ActiveSalesReps />} />
          <Route path="/sales-reps/inactive" element={<InactiveSalesReps />} />
          <Route path="/sales-reps/create" element={<CreateSalesRep />} />
          <Route path="/sales-reps/:id/edit" element={<CreateSalesRep />} />
          <Route path="/sales-reps/:id" element={<ViewSalesRep />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default App
