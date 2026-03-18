import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const levelDescriptions = {
  superuser: 'Full system access with all administrative privileges',
  admin: 'Administrative access with limited system configuration',
  'sales-rep': 'Access to sales, customers, commissions and reporting',
  'data-entry': 'Basic data entry access for invoices and customer records',
}

export default function UserCreate() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
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

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function getPasswordStrength(pwd) {
    if (!pwd) return { width: '0%', color: '', label: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { width: '25%', color: '#ef4444', label: 'Weak' }
    if (score === 2) return { width: '50%', color: '#f59e0b', label: 'Fair' }
    if (score === 3) return { width: '75%', color: '#3b82f6', label: 'Good' }
    return { width: '100%', color: '#10b981', label: 'Strong' }
  }

  const pwdStrength = getPasswordStrength(form.password)
  const pwdMatch = form.confirmPassword ? form.password === form.confirmPassword : null

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
    if (!form.password || form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Uniqueness checks
    try {
      const emailCheck = await api.checkUniqueUser('email', form.email.trim())
      if (!emailCheck.unique) { toast.error('Email already exists'); return }
      if (form.username.trim()) {
        const userCheck = await api.checkUniqueUser('username', form.username.trim())
        if (!userCheck.unique) { toast.error('Username already exists'); return }
      }
    } catch {}

    setSaving(true)
    try {
      await api.createUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        username: form.username.trim() || '',
        phone: form.phone.trim() || null,
        extension: form.extension.trim() || '',
        country_code: form.country_code.trim() || '',
        password: form.password,
        level: form.level,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      toast.success(`User "${form.first_name} ${form.last_name}" created!`)
      navigate('/admin/users')
    } catch (err) {
      toast.error('Failed to create user: ' + err.message)
    }
    setSaving(false)
  }

  const initials = getInitials()

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
              <li className="breadcrumb-item active">Create User</li>
            </ol>
          </nav>
          <h3 className="mb-0">Create User</h3>
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
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-telephone"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      name="country_code"
                      value={form.country_code}
                      onChange={handleChange}
                      placeholder="+1"
                      style={{ maxWidth: 60 }}
                    />
                    <input
                      type="tel"
                      className="form-control"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <i className="bi bi-shield-lock"></i>
                </span>
                Security
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-control"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                    >
                      <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                  {form.password && (
                    <>
                      <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: pwdStrength.width, background: pwdStrength.color, transition: 'width 0.3s, background 0.3s' }}></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 500, marginTop: 2, color: pwdStrength.color }}>{pwdStrength.label}</div>
                    </>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type="password"
                      className="form-control"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      required
                    />
                    {pwdMatch !== null && (
                      <span className="input-group-text">
                        <i className={`bi ${pwdMatch ? 'bi-check-lg text-success' : 'bi-x-lg text-danger'}`}></i>
                      </span>
                    )}
                  </div>
                  {pwdMatch !== null && (
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: pwdMatch ? '#10b981' : '#ef4444' }}>
                      {pwdMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 8 }}>
                <i className="bi bi-info-circle me-1"></i> Password must be at least 8 characters with uppercase, lowercase, and numbers.
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
                  : 'New User'}
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
                    <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                  ) : (
                    <><i className="bi bi-check-lg me-1"></i> Create User</>
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
