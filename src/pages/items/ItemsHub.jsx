import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import PageChartHeader from '../../components/PageChartHeader'
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
  const [stats, setStats] = useState([])
  const [chartData, setChartData] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [products, types] = await Promise.all([api.getProducts(), api.getItemTypes()])
        const activeTypes = types.filter(t => t.status === 'active').length
        const totalProds = products.length
        const avgPrice = products.length > 0 ? (products.reduce((s, p) => s + (p.unit_price || 0), 0) / products.length) : 0

        setStats([
          { label: 'Total Products', value: totalProds, icon: 'bi-box-seam', color: '#2563eb', bg: '#eff6ff' },
          { label: 'Active Types', value: activeTypes, icon: 'bi-tags', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Avg Price', value: `$${avgPrice.toFixed(2)}`, icon: 'bi-currency-dollar', color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Grouped Items', value: products.filter(p => p.group_id).length, icon: 'bi-collection', color: '#ea580c', bg: '#fff7ed' },
        ])

        // Chart Data: Product Distribution by Type
        const typeCounts = {}
        products.forEach(p => {
          const type = (p.item_type && typeof p.item_type === 'object') ? p.item_type.name : 'Other'
          typeCounts[type] = (typeCounts[type] || 0) + 1
        })

        setChartData({
          labels: Object.keys(typeCounts),
          datasets: [{
            label: 'Product Distribution',
            data: Object.values(typeCounts),
            backgroundColor: ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#0ea5e9'],
            borderWidth: 0,
          }]
        })
      } catch (err) { console.error('Stats error:', err) }
    }
    fetchStats()
  }, [])

  function setTab(key) {
    setSearchParams({ tab: key })
  }

  return (
    <div>
      <PageChartHeader
        title="Item Management"
        subtitle="Manage your products, categories, sizes and groupings"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Items' }
        ]}
        stats={stats}
        chartData={chartData}
        chartType="bar"
      />

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
