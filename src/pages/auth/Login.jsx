import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

// Quick-fill shortcuts with real credentials from the database
const roleDefaults = {
  admin:        { email: 'admin@stallioni.com',       password: 'superuser' },
  'sales-rep':  { email: 'tami.airfeet@gmail.com',    password: 'superuser' },
  'data-entry': { email: 'gomathi@stallioni.com',      password: 'abc123'   },
}

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail]       = useState(roleDefaults.admin.email)
  const [password, setPassword] = useState(roleDefaults.admin.password)
  const [showPwd, setShowPwd]   = useState(false)
  const [role, setRole]         = useState('admin')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading]   = useState(false)

  function handleRoleChange(newRole) {
    setRole(newRole)
    const def = roleDefaults[newRole] || roleDefaults.admin
    setEmail(def.email)
    setPassword(def.password)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    if (!password)     { toast.error('Please enter your password'); return }

    setLoading(true)
    try {
      const user = await api.loginUser(email.trim(), password)
      localStorage.setItem('ct_user', JSON.stringify(user))
      if (onLogin) onLogin(user)
      toast.success(`Welcome back, ${user.first_name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Invalid email or password')
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
          {/* Quick-access role selector */}
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '.82rem', fontWeight: 600, color: '#475569' }}>
              <i className="bi bi-person-badge me-1"></i>Quick Select Account
            </label>
            <div className="role-selector">
              {[
                { value: 'admin',      icon: 'bi-shield-lock-fill',  label: 'Admin',      sub: 'Full access'  },
                { value: 'sales-rep',  icon: 'bi-person-workspace',  label: 'Sales Rep',  sub: 'Sales focus'  },
                { value: 'data-entry', icon: 'bi-keyboard',          label: 'Data Entry', sub: 'Entry tasks'  },
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

          {/* Email */}
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-envelope"></i></span>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label">Password</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-lock"></i></span>
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-group-text btn btn-outline-secondary border-start-0"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
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
            <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: '.85rem', color: '#94a3b8', cursor: 'default' }}>
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
