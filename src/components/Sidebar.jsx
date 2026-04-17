import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

// adminOnly: true  →  hidden from sales-rep
// salesOnly: true  →  hidden from admin/superuser (not used currently)
// no flag           →  visible to everyone

const navSections = [
  {
    title: null,
    items: [
      { label: 'Dashboard', icon: 'bi-grid-1x2-fill', path: '/dashboard' },
    ]
  },
  {
    title: 'Administration',
    icon: 'bi-shield-lock',
    label: 'Admin',
    adminOnly: true,
    children: [
      { label: 'Users', path: '/admin/users' },
      { label: 'Create User', path: '/admin/users/create' },
      { label: 'User Levels', path: '/admin/levels' },
      { label: 'User Access', path: '/admin/access' },
      { label: 'Default Access', path: '/admin/default-access' },
      { label: 'User Activity', path: '/admin/activity' },
      { label: 'Privileges', path: '/admin/privileges' },
      { label: 'Backup', path: '/admin/backup' },
    ]
  },
  {
    title: 'Items',
    icon: 'bi-tags',
    label: 'Items',
    adminOnly: true,
    children: [
      { label: 'Item Types', path: '/items?tab=types' },
      { label: 'Product Items', path: '/items?tab=products' },
      { label: 'Sizes', path: '/items?tab=sizes' },
      { label: 'Group Products', path: '/items?tab=groups' },
    ]
  },
  {
    title: 'Sales',
    icon: 'bi-people',
    label: 'Sales Reps',
    adminOnly: true,
    children: [
      { label: 'Active', path: '/sales-reps/active' },
      { label: 'Inactive', path: '/sales-reps/inactive' },
      { label: 'Reports - Monthly', path: '/sales-reps/reports?tab=rep-month' },
      { label: 'Reports - Yearly', path: '/sales-reps/reports?tab=rep-year' },
    ]
  },
  {
    title: 'Customers',
    icon: 'bi-building',
    label: 'Customers',
    children: [
      { label: 'Active', path: '/customers/active' },
      { label: 'Inactive', path: '/customers/inactive', adminOnly: true },
      { label: 'Pilot', path: '/customers/pilot', adminOnly: true },
      { label: 'Suppliers', path: '/customers/suppliers', adminOnly: true },
      { label: 'Customer Types', path: '/customers/types', adminOnly: true },
      { label: 'Import / Export', path: '/customers/import-export', adminOnly: true },
      { label: 'Reports - Yearly', path: '/customers/reports?tab=year', adminOnly: true },
      { label: 'Reports - Monthly', path: '/customers/reports?tab=month', adminOnly: true },
    ]
  },
  {
    title: 'Billing',
    icon: 'bi-receipt',
    label: 'Invoices',
    children: [
      { label: 'Invoices', path: '/invoices' },
      { label: 'Outstanding', path: '/invoices/outstanding' },
      { label: 'Outstand Emails', path: '/invoices/outstand-emails', adminOnly: true },
      { label: 'Reports - Paid', path: '/invoices/reports', adminOnly: true },
    ]
  },
  {
    title: 'Finance',
    items: [
      { label: 'Commissions', icon: 'bi-cash-stack', path: '/commissions', adminOnly: true },
      { label: 'Commission Report', icon: 'bi-file-earmark-bar-graph', path: '/commissions/report' },
      { label: 'Airfeet PO', icon: 'bi-file-earmark-text', path: '/airfeet-po', adminOnly: true },
      { label: 'Pilot Programs', icon: 'bi-clipboard2-pulse', path: '/pilot-programs', adminOnly: true },
      { label: 'Events', icon: 'bi-calendar-event', path: '/events', adminOnly: true },
    ]
  },
]

export default function Sidebar({ isOpen, onClose, user }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState({ Administration: true })

  const isSalesRep = user?.level === 'sales-rep'

  function canSee(item) {
    if (!item.adminOnly) return true
    return !isSalesRep
  }

  const toggleMenu = (title) => {
    setOpenMenus(prev => ({ ...prev, [title || Math.random()]: !prev[title] }))
  }

  const isChildActive = (children) => {
    const full = location.pathname + location.search
    return children?.some(c => {
      if (c.path.includes('?')) {
        return full === c.path || full.startsWith(c.path + '&')
      }
      return location.pathname === c.path || location.pathname.startsWith(c.path + '/')
    })
  }

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
        <i className="bi bi-x-lg"></i>
      </button>

      <div className="sidebar-brand">
        <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Commission Tracker" style={{ maxWidth: '100%', height: 'auto', maxHeight: 45 }} />
        <h5>Commission Tracker</h5>
      </div>

      {isSalesRep && (
        <div style={{ padding: '6px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logged in as</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Sales Rep</div>
        </div>
      )}

      <ul className="sidebar-nav">
        {navSections.map((section, si) => {
          // Hide entire section if adminOnly and user is sales rep
          if (section.adminOnly && isSalesRep) return null

          // Filter children for collapsible sections
          const visibleChildren = section.children?.filter(c => canSee(c))
          // Filter items for flat sections
          const visibleItems = section.items?.filter(i => canSee(i))

          // If a collapsible section has no visible children, hide it
          if (section.children && (!visibleChildren || visibleChildren.length === 0)) return null

          return (
            <li key={si}>
              {section.title && (
                <div className="sidebar-section">{section.title}</div>
              )}

              {/* Direct items (no collapse) */}
              {visibleItems?.map((item, ii) => (
                <NavLink
                  key={ii}
                  to={item.disabled ? '#' : item.path}
                  className={({ isActive }) => `sidebar-link${isActive && !item.disabled ? ' active' : ''}`}
                  onClick={e => { if (item.disabled) e.preventDefault() }}
                  style={item.disabled ? { opacity: 0.5 } : {}}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {/* Collapsible menu */}
              {visibleChildren && (
                <>
                  <a
                    href="#"
                    className={`sidebar-link${isChildActive(visibleChildren) ? ' active' : ''}`}
                    onClick={e => { e.preventDefault(); toggleMenu(section.label) }}
                  >
                    <i className={`bi ${section.icon}`}></i>
                    <span>{section.label}</span>
                    <i className={`bi bi-chevron-${openMenus[section.label] ? 'down' : 'right'} ms-auto`} style={{ fontSize: '0.7rem' }}></i>
                  </a>
                  {openMenus[section.label] && (
                    <div className="sidebar-submenu" style={{ paddingLeft: '20px' }}>
                      {visibleChildren.map((child, ci) => {
                        const full = location.pathname + location.search
                        const isActive = child.path.includes('?')
                          ? full === child.path
                          : location.pathname === child.path
                        return (
                          <NavLink
                            key={ci}
                            to={child.disabled ? '#' : child.path}
                            className={`sidebar-link${isActive && !child.disabled ? ' active' : ''}`}
                            onClick={e => { if (child.disabled) e.preventDefault() }}
                            style={child.disabled ? { opacity: 0.5 } : {}}
                          >
                            <span>{child.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
