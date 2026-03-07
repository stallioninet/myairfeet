import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const modules = ['Dashboard', 'Customers', 'Invoices', 'Commissions', 'Sales Reps', 'Events', 'Reports', 'Settings', 'Admin']

export default function PrivilegeCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    module: '',
    description: '',
    status: 'active',
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.module) {
      toast.error('Please fill in all required fields')
      return
    }
    toast.success(`Privilege "${form.name}" created!`)
    navigate('/admin/privileges')
  }

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item"><Link to="/admin/privileges">Privileges</Link></li>
              <li className="breadcrumb-item active">Create</li>
            </ol>
          </nav>
          <h3 className="mb-0">Create Privilege</h3>
        </div>
        <Link to="/admin/privileges" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-1"></i> Back
        </Link>
      </div>

      {/* Form */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <h5 className="mb-0"><i className="bi bi-key me-2"></i>Privilege Details</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Privilege Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter privilege name"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Module <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  name="module"
                  value={form.module}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Module...</option>
                  {modules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  rows="3"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter privilege description"
                ></textarea>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-check-lg me-1"></i> Save
              </button>
              <Link to="/admin/privileges" className="btn btn-outline-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
