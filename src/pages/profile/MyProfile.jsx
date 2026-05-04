import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'


const levelLabels = {
  superuser:    'Superuser',
  admin:        'Admin',
  'sales-rep':  'Sales Rep',
  'data-entry': 'Data Entry',
}

const levelColors = {
  superuser:    { bg: '#fef2f2', color: '#dc2626', icon: 'bi-star-fill' },
  admin:        { bg: '#eff6ff', color: '#2563eb', icon: 'bi-shield-fill' },
  'sales-rep':  { bg: '#f0fdf4', color: '#16a34a', icon: 'bi-person-workspace' },
  'data-entry': { bg: '#f5f3ff', color: '#7c3aed', icon: 'bi-keyboard' },
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

function fmtDate(d) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MyProfile() {
  const fileInputRef = useRef(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [currentImage, setCurrentImage] = useState(null)
  const [userId, setUserId]         = useState(null)
  const [userInfo, setUserInfo]     = useState(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', username: '',
    phone: '', country_code: '', notes: '',
    address: '',
  })
  const [pwdForm, setPwdForm] = useState({
    old_password: '', new_password: '', confirm_password: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('ct_user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setUserId(u._id)
        loadUser(u._id)
      } catch { setLoading(false) }
    } else {
      setLoading(false)
    }
  }, [])

  async function loadUser(id) {
    setLoading(true)
    try {
      const data = await api.getUser(id)
      setUserInfo(data)
      setForm({
        first_name:   data.first_name   || '',
        last_name:    data.last_name    || '',
        email:        data.email        || '',
        username:     data.username     || '',
        phone:        data.phone        || '',
        country_code: data.country_code || '',
        notes:        data.notes        || '',
        address:      data.address      || '',
      })
      setCurrentImage(data.image || null)
    } catch {
      toast.error('Failed to load profile')
    }
    setLoading(false)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePwdChange(e) {
    setPwdForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function cancelImageChange() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRemoveCurrentImage() {
    try {
      await api.deleteUserImage(userId)
      setCurrentImage(null)
      syncLocalStorage({ image: null })
      toast.success('Photo removed')
    } catch {
      toast.error('Failed to remove photo')
    }
  }

  function syncLocalStorage(patch) {
    try {
      const stored = localStorage.getItem('ct_user')
      if (!stored) return
      const u = { ...JSON.parse(stored), ...patch }
      localStorage.setItem('ct_user', JSON.stringify(u))
      window.dispatchEvent(new Event('ct_user_updated'))
    } catch {}
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Invalid email format')
      return
    }
    setSaving(true)
    try {
      const emailCheck = await api.checkUniqueUser('email', form.email.trim(), userId)
      if (!emailCheck.unique) { toast.error('Email already in use'); setSaving(false); return }
      if (form.username.trim()) {
        const userCheck = await api.checkUniqueUser('username', form.username.trim(), userId)
        if (!userCheck.unique) { toast.error('Username already in use'); setSaving(false); return }
      }

      const updated = await api.updateUser(userId, {
        first_name:   form.first_name.trim(),
        last_name:    form.last_name.trim(),
        email:        form.email.trim(),
        username:     form.username.trim() || '',
        phone:        form.phone.trim() || null,
        country_code: form.country_code.trim() || '',
        notes:        form.notes.trim() || null,
        address:      form.address.trim() || '',
      })

      if (imageFile) {
        try {
          const result = await api.uploadUserImage(userId, imageFile)
          setCurrentImage(result.image)
          cancelImageChange()
          updated.image = result.image
        } catch {
          toast.error('Profile saved but photo upload failed')
        }
      }

      setUserInfo(updated)
      syncLocalStorage({
        first_name: updated.first_name,
        last_name:  updated.last_name,
        email:      updated.email,
        username:   updated.username,
        image:      updated.image,
      })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error('Failed to update profile: ' + err.message)
    }
    setSaving(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!pwdForm.old_password)                              { toast.error('Enter your current password'); return }
    if (!pwdForm.new_password || pwdForm.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (pwdForm.new_password !== pwdForm.confirm_password) { toast.error('Passwords do not match'); return }

    setChangingPwd(true)
    try {
      await api.loginUser(form.email, pwdForm.old_password)
      await api.updateUser(userId, { password: pwdForm.new_password })
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed!')
    } catch (err) {
      toast.error(
        err.message === 'Invalid email or password'
          ? 'Current password is incorrect'
          : 'Failed to change password'
      )
    }
    setChangingPwd(false)
  }

  function getInitials() {
    const f = form.first_name.trim()
    const l = form.last_name.trim()
    if (!f && !l) return 'U'
    return ((f[0] || '') + (l[0] || '')).toUpperCase()
  }

  const pwdStrength = getPasswordStrength(pwdForm.new_password)
  const pwdMatch    = pwdForm.confirm_password ? pwdForm.new_password === pwdForm.confirm_password : null
  const displayImage = imagePreview || (currentImage ? api.getUserImageUrl(currentImage) : null)
  const lvl = userInfo?.level || ''
  const lvlStyle = levelColors[lvl] || { bg: '#f1f5f9', color: '#64748b', icon: 'bi-person' }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted">Loading profile...</div>
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
              <li className="breadcrumb-item active">My Profile</li>
            </ol>
          </nav>
          <h3 className="mb-0">My Profile</h3>
        </div>
      </div>

      <div className="row g-4">

        {/* ── RIGHT COLUMN ── */}
        <div className="col-lg-4 order-first order-lg-last">

          {/* Profile Card */}
          <div className="form-section p-4 mb-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {/* Avatar */}
            <div style={{ position: 'relative', width: 96, margin: '0 auto 16px' }}>
              <div
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: displayImage ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 700, color: '#fff',
                  border: '3px solid #e2e8f0', cursor: 'pointer', overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.18)',
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change photo"
              >
                {displayImage
                  ? <img src={displayImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials()
                }
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#2563eb', border: '2px solid #fff',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, cursor: 'pointer', fontSize: 12,
                }}
                title="Change photo"
              >
                <i className="bi bi-camera-fill"></i>
              </button>
            </div>

            <h5 className="mb-1 fw-bold">{form.first_name} {form.last_name}</h5>
            <div className="text-muted mb-2" style={{ fontSize: '0.83rem' }}>{form.email}</div>
            {form.username && (
              <div className="text-muted mb-2" style={{ fontSize: '0.78rem' }}>@{form.username}</div>
            )}
            <span
              className="badge rounded-pill px-3 py-2"
              style={{ background: lvlStyle.bg, color: lvlStyle.color, fontSize: '0.78rem', fontWeight: 600 }}
            >
              <i className={`bi ${lvlStyle.icon} me-1`} style={{ fontSize: 11 }}></i>
              {levelLabels[lvl] || lvl}
            </span>

            <div className="mt-3">
              {imagePreview ? (
                <div className="d-flex gap-2 justify-content-center">
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                    {saving
                      ? <span className="spinner-border spinner-border-sm me-1"></span>
                      : <i className="bi bi-upload me-1"></i>
                    }
                    Save Photo
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelImageChange}>Cancel</button>
                </div>
              ) : currentImage ? (
                <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={handleRemoveCurrentImage}>
                  <i className="bi bi-x-circle me-1"></i>Remove photo
                </button>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                  Click avatar to upload photo
                </div>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="form-section p-4">
            <div className="section-title">
              <span className="section-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <i className="bi bi-info-circle"></i>
              </span>
              Account Info
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              {[
                { label: 'Role',
                  value: <span className="fw-semibold" style={{ color: lvlStyle.color }}>{levelLabels[lvl] || lvl}</span> },
                { label: 'Status',
                  value: <span className={`badge ${userInfo?.status === 'active' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.72rem' }}>
                    {userInfo?.status === 'active' ? 'Active' : 'Inactive'}
                  </span> },
                { label: 'Last Login',  value: fmtDateTime(userInfo?.last_login) },
                { label: 'Member Since', value: fmtDate(userInfo?.created_at) },
                { label: 'Updated',      value: fmtDate(userInfo?.updated_at) },
              ].map(({ label, value }, i, arr) => (
                <div key={label}
                  className="d-flex justify-content-between align-items-center py-2"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span className="text-muted">{label}</span>
                  <span className="fw-medium text-end" style={{ maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LEFT COLUMN ── */}
        <div className="col-lg-8 order-last order-lg-first">

          {/* Personal Information */}
          <form onSubmit={handleSave}>
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
                  <input type="text" className="form-control" name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email Address <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                    <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} placeholder="user@example.com" required />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Username</label>
                  <div className="input-group">
                    <span className="input-group-text">@</span>
                    <input type="text" className="form-control" name="username" value={form.username} onChange={handleChange} placeholder="username" />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-telephone"></i></span>
                    <input type="text" className="form-control" name="country_code" value={form.country_code} onChange={handleChange} placeholder="+1" style={{ maxWidth: 60 }} />
                    <input type="tel" className="form-control" name="phone" value={form.phone} onChange={handleChange} placeholder="(555) 123-4567" />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <i className="bi bi-geo-alt"></i>
                </span>
                Address
              </div>
              <textarea
                className="form-control"
                name="address"
                rows="3"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter your full address"
              />
            </div>

            {/* Notes */}
            <div className="form-section p-4 mb-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <i className="bi bi-chat-left-text"></i>
                </span>
                Notes
              </div>
              <textarea className="form-control" name="notes" rows="3" value={form.notes} onChange={handleChange} placeholder="Any additional notes..." />
            </div>

            <div className="d-flex justify-content-end mb-4">
              <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                  : <><i className="bi bi-check-lg me-1"></i>Save Changes</>
                }
              </button>
            </div>
          </form>

          {/* Change Password */}
          <form onSubmit={handleChangePassword}>
            <div className="form-section p-4">
              <div className="section-title">
                <span className="section-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <i className="bi bi-shield-lock"></i>
                </span>
                Change Password
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Current Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-lock"></i></span>
                    <input
                      type={showOldPwd ? 'text' : 'password'}
                      className="form-control"
                      name="old_password"
                      value={pwdForm.old_password}
                      onChange={handlePwdChange}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowOldPwd(v => !v)}>
                      <i className={`bi ${showOldPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">New Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      className="form-control"
                      name="new_password"
                      value={pwdForm.new_password}
                      onChange={handlePwdChange}
                      placeholder="New password"
                      autoComplete="new-password"
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNewPwd(v => !v)}>
                      <i className={`bi ${showNewPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                  {pwdForm.new_password && (
                    <>
                      <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: pwdStrength.width, background: pwdStrength.color, transition: 'width 0.3s, background 0.3s' }} />
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
                      name="confirm_password"
                      value={pwdForm.confirm_password}
                      onChange={handlePwdChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
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
                <i className="bi bi-info-circle me-1"></i>
                Minimum 8 characters with uppercase, lowercase, and numbers.
              </div>
              <div className="mt-3 d-flex justify-content-end">
                <button type="submit" className="btn btn-danger px-4" disabled={changingPwd}>
                  {changingPwd
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</>
                    : <><i className="bi bi-shield-check me-1"></i>Update Password</>
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
