import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ItemTypeList from './ItemTypeList'
import ProductItemList from './ProductItemList'
import ProductSizeList from './ProductSizeList'
import ProductGroupList from './ProductGroupList'

const tabs = [
  { key: 'types', label: 'Item Types', icon: 'bi-tags' },
  { key: 'products', label: 'Product Items', icon: 'bi-box-seam' },
  { key: 'sizes', label: 'Item Sizes', icon: 'bi-rulers' },
  { key: 'groups', label: 'Group Products', icon: 'bi-collection' },
]

export default function ItemsHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'types'

  function setTab(key) {
    setSearchParams({ tab: key })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Item Management</h2>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item active">Items</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="card-body p-0">
          <ul className="nav nav-tabs px-3 pt-2" style={{ borderBottom: '2px solid #e2e8f0', gap: 4 }}>
            {tabs.map(tab => (
              <li className="nav-item" key={tab.key}>
                <button
                  className={'nav-link border-0 d-flex align-items-center gap-2 ' + (activeTab === tab.key ? 'text-primary fw-bold' : 'text-secondary')}
                  style={{
                    fontSize: '0.9rem',
                    padding: '12px 20px',
                    borderBottom: activeTab === tab.key ? '3px solid #2563eb' : '3px solid transparent',
                    background: activeTab === tab.key ? '#eff6ff' : 'transparent',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setTab(tab.key)}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="p-4">
            {activeTab === 'types' && <ItemTypeList />}
            {activeTab === 'products' && <ProductItemList />}
            {activeTab === 'sizes' && <ProductSizeList />}
            {activeTab === 'groups' && <ProductGroupList />}
          </div>
        </div>
      </div>
    </div>
  )
}
