import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

export default function CustomerImportExport() {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const allowedExts = ['xls', 'xlsx', 'csv']

  function handleFile(f) {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!allowedExts.includes(ext)) {
      toast.error('Only XLS, XLSX, and CSV files are allowed')
      return
    }
    setFile(f)
    setResult(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  function removeFile() {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    if (!file) { toast.error('Please select a file to upload'); return }
    setImporting(true)
    setResult(null)
    try {
      const data = await api.importCustomers(file)
      setResult(data)
      toast.success(data.message)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err.message)
    }
    setImporting(false)
  }

  function handleExport() {
    window.open(api.exportCustomersUrl(), '_blank')
  }

  function handleTemplate() {
    window.open(api.templateUrl(), '_blank')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Customers</li>
              <li className="breadcrumb-item active">Import / Export</li>
            </ol>
          </nav>
          <h3 className="mb-0">Customer Import / Export</h3>
        </div>
        <Link to="/customers/active" className="btn btn-outline-secondary">
          <i className="bi bi-building me-1"></i> Customers
        </Link>
      </div>

      <div className="row g-4">
        {/* Import Section */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <h5 className="mb-0"><i className="bi bi-cloud-arrow-up me-2"></i>Customer Import</h5>
            </div>
            <div className="card-body p-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xls,.xlsx,.csv"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />

              {/* Dropzone */}
              <div
                className={`text-center p-4 mb-3${dragOver ? ' drag-active' : ''}`}
                style={{
                  border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
                  borderRadius: 12,
                  background: dragOver ? '#eff6ff' : '#fafbfc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-cloud-arrow-up d-block mb-2" style={{ fontSize: 40, color: dragOver ? '#2563eb' : '#94a3b8' }}></i>
                <div style={{ fontSize: 15, color: '#475569' }}>Drag & drop file here</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  or <span style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>browse files</span>
                </div>
              </div>

              {/* File Info */}
              {file && (
                <div className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 mb-3" style={{ background: '#f1f5f9', fontSize: 13 }}>
                  <span>
                    <i className="bi bi-file-earmark-spreadsheet text-success me-2"></i>
                    {file.name} <small className="text-muted">({(file.size / 1024).toFixed(1)} KB)</small>
                  </span>
                  <button className="btn btn-sm p-0 text-danger" onClick={removeFile} style={{ fontSize: 18, lineHeight: 1 }}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              )}

              {/* Note */}
              <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: 12, color: '#94a3b8' }}>
                <span className="badge bg-danger">Note</span>
                <span>Upload only XLS, XLSX, or CSV files</span>
              </div>

              {/* Import Result */}
              {result && (
                <div className="alert alert-success py-2 mb-3" style={{ fontSize: 13 }}>
                  <i className="bi bi-check-circle me-2"></i>
                  <strong>{result.message}</strong>
                  <div className="mt-1 text-muted" style={{ fontSize: 12 }}>
                    Total rows: {result.total} | New: {result.imported} | Updated: {result.updated} | Skipped: {result.skipped}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={handleImport} disabled={!file || importing}>
                  {importing ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Importing...</>
                  ) : (
                    <><i className="bi bi-cloud-arrow-up me-1"></i> Import</>
                  )}
                </button>
                <button className="btn btn-outline-secondary" onClick={handleTemplate}>
                  <i className="bi bi-download me-1"></i> Download Template
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
              <h5 className="mb-0"><i className="bi bi-cloud-arrow-down me-2"></i>Customer Export</h5>
            </div>
            <div className="card-body p-4">
              <div className="p-3 rounded-3 mb-4" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div className="d-flex align-items-start gap-2">
                  <i className="bi bi-info-circle text-success mt-1"></i>
                  <div style={{ fontSize: 13, color: '#065f46' }}>
                    Click the button below to export all customers to a CSV file. The export includes company info, contact details, address, and business terms.
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="fw-semibold mb-3" style={{ fontSize: 13, color: '#6b7280' }}>CSV columns included:</h6>
                <div className="d-flex flex-wrap gap-1">
                  {['Company Name', 'Customer Type', 'Contact', 'Email', 'Code', 'Notes', 'Terms', 'FOB', 'Ship', 'Ship Via', 'Project', 'Phone', 'Address', 'City', 'State', 'Country', 'Zip'].map(col => (
                    <span key={col} className="badge bg-light text-dark border" style={{ fontSize: 11, fontWeight: 500 }}>{col}</span>
                  ))}
                </div>
              </div>

              <button className="btn btn-success w-100" onClick={handleExport}>
                <i className="bi bi-download me-2"></i> Export Customers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
