import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'

export default function MainLayout({ user, onLogout }) {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="main-content">
        <TopHeader user={user} onLogout={onLogout} />
        <div className="page-body">
          <Outlet />
        </div>
        <div className="page-footer">
          &copy; 2026 Commission Tracker. All rights reserved.
        </div>
      </div>
    </div>
  )
}
