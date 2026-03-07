export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (total === 0) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
      <div className="d-flex align-items-center gap-2">
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={perPage}
          onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1) }}
        >
          {[10, 25, 50, 100].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>entries</span>
        <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
          Showing {start} to {end} of {total} entries
        </span>
      </div>
      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item${page <= 1 ? ' disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)}>&laquo;</button>
          </li>
          {pages.map((p, i) => (
            <li key={i} className={`page-item${p === page ? ' active' : ''}${p === '...' ? ' disabled' : ''}`}>
              <button className="page-link" onClick={() => p !== '...' && onPageChange(p)}>
                {p}
              </button>
            </li>
          ))}
          <li className={`page-item${page >= totalPages ? ' disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)}>&raquo;</button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
