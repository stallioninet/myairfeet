import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const PHONE_TYPES = ['Main', 'Work', 'Desk', 'Home', 'Mobile']

export default function CreateSalesRep() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    rep_number: '', first_name: '', last_name: '', email: '', username: '', password: '',
    territory: '', commission_rate: '', about: '',
    start_date: '', status: 'active'
  })
  const [phones, setPhones] = useState([{ number: '', ext: '', type: 'Main' }])
  const [addresses, setAddresses] = useState([
    { street: '', city: '', state: '', zip: '', country: 'United States' },
    { street: '', city: '', state: '', zip: '', country: 'United States' }
  ])
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addrLabels, setAddrLabels] = useState(['Address', 'Address'])
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelDraft, setLabelDraft] = useState('')

  useEffect(() => {
    if (isEdit) {
      api.getSalesRep(id).then(data => {
        setForm({
          rep_number: data.rep_number || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          username: data.username || '',
          password: '',
          territory: data.territory || '',
          commission_rate: data.commission_rate || '',
          about: data.about || '',
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          status: data.status || 'active'
        })
        if (data.phones && data.phones.length > 0) {
          setPhones(data.phones.map(p => ({ number: p.number || '', ext: p.ext || '', type: p.type || 'Main' })))
        } else if (data.phone) {
          setPhones([{ number: data.phone, ext: '', type: 'Main' }])
        }
        if (data.addresses && data.addresses.length > 0) {
          setAddresses(data.addresses)
          setAddrLabels(data.addresses.map(a => a.label || 'Address'))
        } else if (data.address) {
          setAddresses([
            { street: data.address, city: data.city || '', state: data.state || '', zip: data.zip || '', country: 'United States' },
            { street: '', city: '', state: '', zip: '', country: 'United States' }
          ])
        }
      }).catch(err => toast.error('Failed to load rep: ' + err.message))
    }
  }, [id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function setPhone(idx, key, val) {
    const arr = [...phones]
    arr[idx][key] = val
    setPhones(arr)
  }

  function setAddr(idx, key, val) {
    const arr = [...addresses]
    arr[idx][key] = val
    setAddresses(arr)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.rep_number) { toast.error('Sales REP # is required'); return }
    if (!form.first_name) { toast.error('First name is required'); return }
    if (!form.last_name) { toast.error('Last name is required'); return }
    if (!form.email) { toast.error('Email is required'); return }

    setSaving(true)
    try {
      const validPhones = phones.filter(p => p.number.trim())
      const primaryAddr = addresses[0] || {}
      const payload = {
        ...form,
        commission_rate: parseFloat(form.commission_rate) || 0,
        phones: validPhones,
        phone: validPhones.length > 0 ? validPhones[0].number : '',
        addresses: addresses.map((a, i) => ({ ...a, label: addrLabels[i] || 'Address' })),
        address: primaryAddr.street || '',
        city: primaryAddr.city || '',
        state: primaryAddr.state || '',
        zip: primaryAddr.zip || ''
      }
      if (!payload.password) delete payload.password
      if (isEdit) {
        await api.updateSalesRep(id, payload)
        toast.success('Sales rep updated')
      } else {
        await api.createSalesRep(payload)
        toast.success('Sales rep created')
      }
      navigate('/sales-reps/active')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">{isEdit ? 'Edit' : 'Create New'} Sales Representative</h2>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/sales-reps/active">Sales Rep</Link></li>
              <li className="breadcrumb-item active">{isEdit ? 'Edit' : 'Create New Sales Rep'}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="card-header py-3 px-4 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', border: 'none' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-person-plus-fill fs-5"></i>
            <span className="fw-semibold">{isEdit ? 'Edit' : 'Create'} Sales Representative</span>
          </div>
        </div>
        <div className="card-body p-4">

          {/* User Info */}
          <h5 className="mb-4" style={{ color: '#3b82f6', fontWeight: 400 }}>User Info</h5>

          {/* Sales REP # */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Sales REP # <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={form.rep_number} onChange={e => set('rep_number', e.target.value)} />
            </div>
          </div>

          {/* First / Last Name */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">First Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Last Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>

          {/* Username / Password */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">User Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={form.username} onChange={e => set('username', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Password <span className="text-danger">*</span></label>
              <input type={showPassword ? 'text' : 'password'} className="form-control" value={form.password} onChange={e => set('password', e.target.value)} placeholder={isEdit ? 'Leave blank to keep current' : ''} />
              <div className="form-check mt-1">
                <input className="form-check-input" type="checkbox" id="showPwd" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                <label className="form-check-label small" htmlFor="showPwd" style={{ color: '#16a34a' }}>Show Password</label>
              </div>
            </div>
          </div>

          {/* Phone Numbers + Email side by side */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Phone#</label>
              {phones.map((p, idx) => (
                <div className="d-flex gap-2 mb-2 align-items-center" key={idx}>
                  <input type="tel" className="form-control" placeholder="Phone#" style={{ maxWidth: 160 }} value={p.number} onChange={e => setPhone(idx, 'number', e.target.value)} />
                  <div>
                    {idx === 0 && <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Ext#</small>}
                    <input type="text" className="form-control" placeholder="Ext#" style={{ maxWidth: 100 }} value={p.ext} onChange={e => setPhone(idx, 'ext', e.target.value)} />
                  </div>
                  <select className="form-select" style={{ maxWidth: 120 }} value={p.type} onChange={e => setPhone(idx, 'type', e.target.value)}>
                    {PHONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {phones.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" style={{ width: 34, height: 34, padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPhones(phones.filter((_, i) => i !== idx))}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-success btn-sm" onClick={() => setPhones([...phones, { number: '', ext: '', type: 'Main' }])}>
                <i className="bi bi-plus-lg me-1"></i> Add Phone Number
              </button>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Email <span className="text-danger">*</span></label>
              <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* About Sales REP */}
          <div className="mb-4">
            <label className="form-label small fw-semibold">About Sales REP <span className="text-danger">*</span></label>
            <textarea className="form-control" rows="5" value={form.about} onChange={e => set('about', e.target.value)}></textarea>
          </div>

          <hr className="my-4" />

          {/* Address 1 */}
          <div className="mb-3 d-flex align-items-center gap-2 position-relative">
            {editingLabel === 0 ? (
              <div className="d-flex align-items-center gap-2 p-2 border rounded shadow-sm bg-white" style={{ zIndex: 10 }}>
                <div>
                  <div className="text-muted small mb-1">Enter Address Label</div>
                  <input type="text" className="form-control form-control-sm" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} autoFocus style={{ width: 180 }} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { const arr = [...addrLabels]; arr[0] = labelDraft || 'Address'; setAddrLabels(arr); setEditingLabel(null) }}><i className="bi bi-check-lg"></i></button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingLabel(null)}><i className="bi bi-x-lg"></i></button>
              </div>
            ) : (
              <h5 className="mb-0" style={{ fontWeight: 400 }}>
                <span style={{ color: '#3b82f6', cursor: 'pointer', borderBottom: '2px dashed #3b82f6' }} onClick={() => { setLabelDraft(addrLabels[0]); setEditingLabel(0) }}>{addrLabels[0]}</span>
                <small className="text-muted ms-2">(click on "{addrLabels[0]}" to edit)</small>
              </h5>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Street</label>
            <input type="text" className="form-control" value={addresses[0].street} onChange={e => setAddr(0, 'street', e.target.value)} />
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">City</label>
              <input type="text" className="form-control" value={addresses[0].city} onChange={e => setAddr(0, 'city', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">State</label>
              <select className="form-select" value={addresses[0].state} onChange={e => setAddr(0, 'state', e.target.value)}>
                <option value="">Please select states</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Zip Code</label>
              <input type="text" className="form-control" value={addresses[0].zip} onChange={e => setAddr(0, 'zip', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Country</label>
              <select className="form-select" value={addresses[0].country} onChange={e => setAddr(0, 'country', e.target.value)}>
                <option value="United States">United States</option>
              </select>
            </div>
          </div>

          <hr className="my-4" />

          {/* Address 2 */}
          <div className="mb-3 d-flex align-items-center gap-2 position-relative">
            {editingLabel === 1 ? (
              <div className="d-flex align-items-center gap-2 p-2 border rounded shadow-sm bg-white" style={{ zIndex: 10 }}>
                <div>
                  <div className="text-muted small mb-1">Enter Address Label</div>
                  <input type="text" className="form-control form-control-sm" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} autoFocus style={{ width: 180 }} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { const arr = [...addrLabels]; arr[1] = labelDraft || 'Address'; setAddrLabels(arr); setEditingLabel(null) }}><i className="bi bi-check-lg"></i></button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingLabel(null)}><i className="bi bi-x-lg"></i></button>
              </div>
            ) : (
              <h5 className="mb-0" style={{ fontWeight: 400 }}>
                <span style={{ color: '#3b82f6', cursor: 'pointer', borderBottom: '2px dashed #3b82f6' }} onClick={() => { setLabelDraft(addrLabels[1]); setEditingLabel(1) }}>{addrLabels[1]}</span>
                <small className="text-muted ms-2">(click on "{addrLabels[1]}" to edit)</small>
              </h5>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Street</label>
            <input type="text" className="form-control" value={addresses[1].street} onChange={e => setAddr(1, 'street', e.target.value)} />
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">City</label>
              <input type="text" className="form-control" value={addresses[1].city} onChange={e => setAddr(1, 'city', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">State</label>
              <select className="form-select" value={addresses[1].state} onChange={e => setAddr(1, 'state', e.target.value)}>
                <option value="">Please select states</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Zip Code</label>
              <input type="text" className="form-control" value={addresses[1].zip} onChange={e => setAddr(1, 'zip', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Country</label>
              <select className="form-select" value={addresses[1].country} onChange={e => setAddr(1, 'country', e.target.value)}>
                <option value="United States">United States</option>
              </select>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="card-footer bg-white border-top px-4 py-3">
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving...' : 'Save'}
            </button>
            <Link to="/sales-reps/active" className="btn btn-outline-secondary">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
