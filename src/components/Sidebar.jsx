import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

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
    children: [
      { label: 'Active', path: '/sales-reps/active' },
      { label: 'Inactive', path: '/sales-reps/inactive' },
    ]
  },
  {
    title: 'Customers',
    icon: 'bi-building',
    label: 'Customers',
    children: [
      { label: 'Active', path: '/customers/active' },
      { label: 'Inactive', path: '/customers/inactive' },
      { label: 'Pilot', path: '/customers/pilot' },
      { label: 'Suppliers', path: '/customers/suppliers' },
      { label: 'Customer Types', path: '/customers/types' },
      { label: 'Import / Export', path: '/customers/import-export' },
    ]
  },
  {
    title: 'Billing',
    icon: 'bi-receipt',
    label: 'Invoices',
    children: [
      { label: 'Invoices', path: '/invoices' },
      { label: 'Outstanding', path: '/invoices/outstanding' },
      { label: 'Outstand Emails', path: '/invoices/outstand-emails' },
    ]
  },
  {
    title: 'Finance',
    items: [
      { label: 'Commissions', icon: 'bi-cash-stack', path: '/commissions' },
      { label: 'Pilot Programs', icon: 'bi-clipboard2-pulse', path: '/pilot-programs' },
      { label: 'Airfeet PO', icon: 'bi-file-earmark-text', path: '/airfeet-po' },
      { label: 'Events', icon: 'bi-calendar-event', path: '/events' },
    ]
  },
  {
    title: 'Analytics',
    icon: 'bi-graph-up',
    label: 'Reports',
    children: [
      { label: 'Year', path: '/reports?tab=year' },
      { label: 'Month', path: '/reports?tab=month' },
      { label: 'Sales Rep Month', path: '/reports?tab=rep-month' },
      { label: 'Sales Rep Year', path: '/reports?tab=rep-year' },
      { label: 'Paid Invoice', path: '/reports?tab=paid' },
    ]
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState({ Administration: true })

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
      {/* Close button for mobile */}
      <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
        <i className="bi bi-x-lg"></i>
      </button>

      <div className="sidebar-brand">
        <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Commission Tracker" style={{ maxWidth: '100%', height: 'auto', maxHeight: 45 }} />
        <h5>Commission Tracker</h5>
      </div>
      <ul className="sidebar-nav">
        {navSections.map((section, si) => (
          <li key={si}>
            {section.title && (
              <div className="sidebar-section">{section.title}</div>
            )}

            {/* Direct items (no collapse) */}
            {section.items?.map((item, ii) => (
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
            {section.children && (
              <>
                <a
                  href="#"
                  className={`sidebar-link${isChildActive(section.children) ? ' active' : ''}`}
                  onClick={e => { e.preventDefault(); toggleMenu(section.label) }}
                >
                  <i className={`bi ${section.icon}`}></i>
                  <span>{section.label}</span>
                  <i className={`bi bi-chevron-${openMenus[section.label] ? 'down' : 'right'} ms-auto`} style={{ fontSize: '0.7rem' }}></i>
                </a>
                {openMenus[section.label] && (
                  <div className="sidebar-submenu" style={{ paddingLeft: '20px' }}>
                    {section.children.map((child, ci) => {
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
        ))}
      </ul>
    </nav>
  )
}
