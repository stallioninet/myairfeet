import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

const roleEmails = {
  admin: 'admin@company.com',
  'sales-rep': 'sarah.johnson@company.com',
  'data-entry': 'jane.smith@company.com',
}

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@company.com')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState('admin')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  function handleRoleChange(newRole) {
    setRole(newRole)
    setEmail(roleEmails[newRole] || 'admin@company.com')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      const user = await api.loginUser(email.trim())
      localStorage.setItem('ct_user', JSON.stringify(user))
      if (onLogin) onLogin(user)
      toast.success(`Welcome back, ${user.first_name}!`)
      navigate('/dashboard')
    } catch (err) {
      // For demo: allow login with any credentials
      const demoUser = {
        _id: 'demo',
        first_name: 'Admin',
        last_name: 'User',
        email: email.trim(),
        level: role,
        status: 'active',
      }
      localStorage.setItem('ct_user', JSON.stringify(demoUser))
      if (onLogin) onLogin(demoUser)
      toast.success('Welcome back!')
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="mb-3 p-3 rounded-3" style={{ background: '#0f172a', display: 'inline-block' }}>
            <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Commission Tracker" style={{ maxWidth: 200, height: 'auto' }} />
          </div>
          <h2>Commission Tracker</h2>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-envelope"></i></span>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-lock"></i></span>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          {/* Role Selector for Demo */}
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '.82rem', fontWeight: 600, color: '#475569' }}>
              <i className="bi bi-person-badge me-1"></i>Demo: Select User Role
            </label>
            <div className="role-selector">
              {[
                { value: 'admin', icon: 'bi-shield-lock-fill', label: 'Admin', sub: 'Full access' },
                { value: 'sales-rep', icon: 'bi-person-workspace', label: 'Sales Rep', sub: 'Sales focus' },
                { value: 'data-entry', icon: 'bi-keyboard', label: 'Data Entry', sub: 'Entry tasks' },
              ].map(r => (
                <div className="role-option" key={r.value}>
                  <input
                    type="radio"
                    name="userRole"
                    id={`role-${r.value}`}
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => handleRoleChange(r.value)}
                  />
                  <label htmlFor={`role-${r.value}`}>
                    <i className={`bi ${r.icon}`}></i>
                    <span>{r.label}</span>
                    <small>{r.sub}</small>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="remember" style={{ fontSize: '.85rem' }}>
                Remember me
              </label>
            </div>
            <a href="#" onClick={e => { e.preventDefault(); toast('Reset link sent!', { icon: '\u2709\uFE0F' }) }} style={{ fontSize: '.85rem' }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className="btn btn-primary w-100 py-2 mb-3" disabled={loading}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
            ) : (
              <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
