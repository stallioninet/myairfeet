import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

const DEFAULT_SUBJECT = 'AIRfeet Invoice Payment Due Reminder'
const DEFAULT_CONTENT = `<p>Dear <strong>{client_name}</strong>,</p>
<p>I'm contacting you on behalf of "<strong>{your_company}</strong>" with regard to the following invoice(s):</p>
{returnvalimport}
<p>It would be greatly appreciated if you could confirm receipt of this invoice and advise as to whether payment has been scheduled.</p>
<p>I have attached a copy of the invoice for your reference. If you require any further information from our side, please let me know.</p>
<p><strong>Best wishes,</strong><br/>Airfeet LLC<br/>Email: info@myairfeet.com<br/>Phone: 317-965-5212</p>`

export default function OutstandEmails() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)
  const [emailHistory, setEmailHistory] = useState([])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Load email template
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const tplRes = await fetch(`${API_URL}/invoices/email-template`).then(r => r.json()).catch(() => null)
      if (tplRes && tplRes.email_subject) {
        setSubject(tplRes.email_subject)
        setContent(tplRes.email_content || DEFAULT_CONTENT)
      }
      // Load overdue invoices
      const invoices = await api.getInvoices()
      const now = new Date()
      const overdueList = (invoices || []).filter(inv => inv.paid_value !== 'PAID' && inv.due_date && new Date(inv.due_date) < now)
      setOverdue(overdueList)
      // Load email history
      const histRes = await fetch(`${API_URL}/invoices/email-history`).then(r => r.json()).catch(() => [])
      setEmailHistory(histRes || [])
    } catch {}
    setLoading(false)
  }

  async function handleSaveTemplate() {
    setSaving(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      await fetch(`${API_URL}/invoices/email-template`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_subject: subject, email_content: content }),
      })
      toast.success('Email template saved')
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  async function handleSendAll() {
    if (overdue.length === 0) { toast.error('No overdue invoices'); return }
    setSending(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/invoices/send-overdue-emails`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content }),
      })
      const data = await res.json()
      toast.success(data.message || `Sent to ${overdue.length} customers`)
      fetchData()
    } catch (err) { toast.error(err.message) }
    setSending(false)
  }

  function fmtDate(d) {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt)) return '-'
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/invoices">Invoices</Link></li>
              <li className="breadcrumb-item active">Outstand Emails</li>
            </ol>
          </nav>
          <h3 className="mb-0">Outstanding Email Template</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={handleSaveTemplate} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Template</>}
          </button>
          <button className="btn btn-danger" onClick={handleSendAll} disabled={sending || overdue.length === 0}>
            {sending ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : <><i className="bi bi-send me-1"></i>Send to All Overdue ({overdue.length})</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-card"><div className="d-flex align-items-center gap-3">
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><i className="bi bi-exclamation-circle-fill"></i></div>
            <div><div className="stat-value">{overdue.length}</div><div className="stat-label">Overdue Invoices</div></div>
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="stat-card"><div className="d-flex align-items-center gap-3">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><i className="bi bi-envelope-fill"></i></div>
            <div><div className="stat-value">{emailHistory.length}</div><div className="stat-label">Emails Sent</div></div>
          </div></div>
        </div>
      </div>

      {/* Keywords info */}
      <div className="alert alert-info mb-4" style={{ fontSize: 13 }}>
        <strong>Available Keywords:</strong>
        <span className="ms-3"><code>{'{client_name}'}</code> - Contact person name</span>
        <span className="ms-3"><code>{'{your_company}'}</code> - Customer company name</span>
        <span className="ms-3"><code>{'{returnvalimport}'}</code> - Outstanding invoice details table</span>
      </div>

      <div className="row g-4">
        {/* Template Editor */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff' }}>
              <h5 className="mb-0"><i className="bi bi-envelope-paper me-2"></i>Email Template</h5>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <label className="form-label fw-semibold">Email Subject</label>
                <input type="text" className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Email Content (HTML)</label>
                <textarea className="form-control" rows="15" value={content} onChange={e => setContent(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }}></textarea>
              </div>
              {/* Preview */}
              <div className="mb-0">
                <label className="form-label fw-semibold">Preview</label>
                <div className="border rounded p-3" style={{ fontSize: 13, maxHeight: 300, overflow: 'auto', background: '#fafbfc' }}>
                  <div dangerouslySetInnerHTML={{ __html: content
                    .replace('{client_name}', '<em>[Contact Name]</em>')
                    .replace('{your_company}', '<em>[Company Name]</em>')
                    .replace('{returnvalimport}', '<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th>Invoice #</th><th>Amount</th><th>Due Date</th></tr><tr><td>13001</td><td>$60.00</td><td>02/15/2026</td></tr></table>')
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue List + History */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff' }}>
              <h5 className="mb-0"><i className="bi bi-exclamation-circle me-2"></i>Overdue Invoices ({overdue.length})</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: 300, overflow: 'auto' }}>
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 12 }}>
                  <thead className="bg-light sticky-top">
                    <tr><th>Customer</th><th>Invoice #</th><th>Due Date</th><th className="text-end">Amount</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="4" className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></td></tr>
                    ) : overdue.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-3 text-muted">No overdue invoices</td></tr>
                    ) : overdue.slice(0, 50).map((inv, i) => (
                      <tr key={i}>
                        <td>{inv.company_name || '-'}</td>
                        <td>{inv.invoice_number || '-'}</td>
                        <td style={{ color: '#dc2626' }}>{fmtDate(inv.due_date)}</td>
                        <td className="text-end">${(parseFloat(inv.net_amount) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Email History */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Email History</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: 250, overflow: 'auto' }}>
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 12 }}>
                  <thead className="bg-light sticky-top">
                    <tr><th>Date</th><th>To</th><th>Subject</th></tr>
                  </thead>
                  <tbody>
                    {emailHistory.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-3 text-muted">No emails sent yet</td></tr>
                    ) : emailHistory.slice(0, 30).map((h, i) => (
                      <tr key={i}>
                        <td>{fmtDate(h.send_date || h.created_at)}</td>
                        <td>{h.sending_mailid || h.to || '-'}</td>
                        <td>{h.subject || h.type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
