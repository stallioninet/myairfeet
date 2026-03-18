import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const levelDescriptions = {
  superuser: 'Full system access with all administrative privileges',
  admin: 'Administrative access with limited system configuration',
  'sales-rep': 'Access to sales, customers, commissions and reporting',
  'data-entry': 'Basic data entry access for invoices and customer records',
}

export default function UserEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    extension: '',
    country_code: '',
    password: '',
    confirmPassword: '',
    level: '',
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    fetchUser()
  }, [id])

  async function fetchUser() {
    setLoading(true)
    try {
      const data = await api.getUser(id)
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        username: data.username || '',
        phone: data.phone || '',
        extension: data.extension || '',
        country_code: data.country_code || '',
        password: '',
        confirmPassword: '',
        level: data.level || '',
        status: data.status || 'active',
        notes: data.notes || '',
      })
    } catch (err) {
      toast.error('User not found')
      navigate('/admin/users')
      return
    }
    setLoading(false)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function getInitials() {
    const f = form.first_name.trim()
    const l = form.last_name.trim()
    if (!f && !l) return null
    return ((f[0] || '') + (l[0] || '')).toUpperCase()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.level) {
      toast.error('Please fill in all required fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Invalid email format')
      return
    }
    // Password validation (only if changing)
    if (form.password) {
      if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    }
    // Uniqueness checks
    try {
      const emailCheck = await api.checkUniqueUser('email', form.email.trim(), id)
      if (!emailCheck.unique) { toast.error('Email already exists'); return }
      if (form.username.trim()) {
        const userCheck = await api.checkUniqueUser('username', form.username.trim(), id)
        if (!userCheck.unique) { toast.error('Username already exists'); return }
      }
    } catch {}

    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        username: form.username.trim() || '',
        phone: form.phone.trim() || null,
        extension: form.extension.trim() || '',
        country_code: form.country_code.trim() || '',
        level: form.level,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (form.password) payload.password = form.password
      await api.updateUser(id, payload)
      toast.success(`User "${form.first_name} ${form.last_name}" updated!`)
      navigate('/admin/users')
    } catch (err) {
      toast.error('Failed to update user: ' + err.message)
    }
    setSaving(false)
  }

  const initials = getInitials()

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted">Loading user...</div>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item"><Link to="/admin/users">Users</Link></li>
              <li className="breadcrumb-item active">Edit User</li>
            </ol>
          </nav>
          <h3 className="mb-0">Edit User</h3>
        </div>
        <Link to="/admin/users" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Users
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Left Column */}
          <div className="col-lg-8">
            {/* Personal Information */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <i className="bi bi-person"></i>
                </span>
                Personal Information
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">First Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email Address <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Username</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-person-badge"></i></span>
                    <input type="text" className="form-control" name="username" value={form.username} onChange={handleChange} placeholder="Enter username" />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-telephone"></i></span>
                    <input type="text" className="form-control" name="country_code" value={form.country_code} onChange={handleChange} placeholder="+1" style={{ maxWidth: 60 }} />
                    <input type="tel" className="form-control" name="phone" value={form.phone} onChange={handleChange} placeholder="(555) 123-4567" />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password (optional) */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <i className="bi bi-key me-2"></i>Change Password <span className="text-muted small fw-normal">(leave blank to keep current)</span>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} placeholder="Enter new password" autoComplete="new-password" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-control" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm new password" autoComplete="new-password" />
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="form-section p-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <i className="bi bi-chat-left-text"></i>
                </span>
                Additional Notes
              </div>
              <textarea
                className="form-control"
                name="notes"
                rows="3"
                value={form.notes}
                onChange={handleChange}
                placeholder="Enter any notes about this user (optional)"
              ></textarea>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-lg-4">
            {/* User Preview */}
            <div className="form-section p-4 mb-4 text-center">
              <div className={`avatar-preview mx-auto mb-3${initials ? ' has-name' : ''}`}>
                {initials || <i className="bi bi-person"></i>}
              </div>
              <h6 className="mb-1">
                {form.first_name.trim() || form.last_name.trim()
                  ? `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
                  : 'User'}
              </h6>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                {form.email.trim() || 'user@example.com'}
              </div>
            </div>

            {/* Role & Status */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <i className="bi bi-person-gear"></i>
                </span>
                Role & Status
              </div>
              <div className="mb-3">
                <label className="form-label">User Level <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select user level</option>
                  <option value="superuser">Superuser</option>
                  <option value="admin">Admin</option>
                  <option value="sales-rep">Sales Rep</option>
                  <option value="data-entry">Data Entry</option>
                </select>
                {form.level && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px' }}>
                    {levelDescriptions[form.level]}
                  </div>
                )}
              </div>
              <div className="mb-3">
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

            {/* Actions */}
            <div className="form-section p-4">
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                  ) : (
                    <><i className="bi bi-check-lg me-1"></i> Update User</>
                  )}
                </button>
                <Link to="/admin/users" className="btn btn-outline-secondary">Cancel</Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
