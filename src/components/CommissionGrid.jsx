import React from 'react'

/**
 * CommissionGrid — shared grid for add/edit commission modals.
 *
 * DEFAULT mode (matching old PHP "Default View"):
 *   • BASE $ column is editable; TOTAL = unit_cost − base_price (the margin per unit)
 *   • Each rep column header has a type selector: "$ Dollar" or "% Percent"
 *   • Dollar rep: input = per-unit $,  auto-total = input × qty
 *   • Percent rep: input = %,           auto-total = (% / 100) × TOTAL × qty
 *   • Validation warning when sum of rep per-unit inputs ≠ TOTAL
 *
 * PERCENT mode (global):
 *   • One % per rep per item; dollar = % / 100 × poNetAmount
 *
 * DOLLAR mode (global):
 *   • One direct $ per rep per item
 */
export default function CommissionGrid({
  mode,           // 'default' | 'percent' | 'dollar'
  onModeChange,   // (newMode) => void
  items,          // [{item_id, item_name, qty, unit_cost, item_size_name?}]
  reps,           // [{repId, repName, repCode}]
  grid,           // {[itemIdx]: {[repId]: {base, commission, percent}}}
  onGridChange,   // (itemIdx, repId, patch) => void  — patch = partial cell obj
  repTypes,       // {[repId]: 'dollar' | 'percent'}  (DEFAULT mode only)
  onRepTypeChange,// (repId, type) => void
  poNetAmount,    // number — full invoice amount (for PERCENT mode)
  getRepTotal,    // (repId) => number
  fmtMoney,       // (v) => string
}) {
  function itemTotal(idx) {
    const item = items[idx]
    if (!item) return 0
    const rawBase = grid[idx]?.[reps[0]?.repId]?.base
    const base = (rawBase !== '' && rawBase != null) ? (parseFloat(rawBase) || 0) : 0
    return Math.max(0, (item.unit_cost || 0) - base)
  }

  function repCommTotal(idx, repId) {
    const cell = grid[idx]?.[repId] || {}
    const item = items[idx]
    const qty = item?.qty || 0
    if (mode === 'default') {
      const type = repTypes[repId] || 'dollar'
      if (type === 'percent') {
        const iTotal = itemTotal(idx)
        return Math.round((parseFloat(cell.percent) || 0) / 100 * iTotal * qty * 100) / 100
      }
      return Math.round((parseFloat(cell.commission) || 0) * qty * 100) / 100
    }
    if (mode === 'percent') {
      return Math.round((parseFloat(cell.percent) || 0) / 100 * poNetAmount * 100) / 100
    }
    return parseFloat(cell.commission) || 0
  }

  function validationMsg(idx) {
    if (mode !== 'default' || reps.length === 0) return null
    const iTotal = itemTotal(idx)
    const sum = reps.reduce((s, r) => {
      const type = repTypes[r.repId] || 'dollar'
      if (type === 'percent') {
        return s + (parseFloat(grid[idx]?.[r.repId]?.percent) || 0) / 100 * iTotal
      }
      return s + (parseFloat(grid[idx]?.[r.repId]?.commission) || 0)
    }, 0)
    const diff = Math.round((sum - iTotal) * 100) / 100
    if (Math.abs(diff) < 0.005) return null
    return diff > 0
      ? { type: 'danger', text: 'Commission total exceeds the item margin' }
      : { type: 'warning', text: 'Commission total is less than the item margin' }
  }

  const overallValidation = (() => {
    if (mode !== 'default') return null
    for (let idx = 0; idx < items.length; idx++) {
      const msg = validationMsg(idx)
      if (msg) return msg
    }
    return null
  })()

  const colSpanPerRep = mode === 'percent' ? 2 : mode === 'default' ? 2 : 1

  return (
    <div>
      {/* Mode buttons */}
      <div className="d-flex justify-content-end gap-2 mb-3">
        {[
          { key: 'percent', label: 'Pay by % of Total', color: '#1abc9c' },
          { key: 'dollar',  label: 'Pay by $',          color: '#1abc9c' },
          { key: 'default', label: 'Default View',       color: '#333'   },
        ].map(b => (
          <button key={b.key} type="button" className="btn px-4"
            style={{ background: b.color, color: '#fff', opacity: mode === b.key ? 1 : 0.6, fontWeight: mode === b.key ? 700 : 400 }}
            onClick={() => onModeChange(b.key)}>
            {b.label}
          </button>
        ))}
      </div>

      {/* Global validation alert */}
      {overallValidation && (
        <div className={`alert alert-${overallValidation.type} py-2 px-3 mb-2`} style={{ fontSize: 13 }}>
          <i className={`bi bi-exclamation-triangle me-2`}></i>{overallValidation.text}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12, textAlign: 'center' }}>
          <thead>
            {/* Header row 1: rep names + type selectors */}
            <tr>
              <th style={{ minWidth: 150, background: '#EDF6ED' }}>Style</th>
              <th style={{ width: 55,  background: '#EDF6ED' }}>QTY</th>
              <th style={{ width: 80,  background: '#EDF6ED' }}>UNIT COST</th>
              <th style={{ width: 90,  background: '#EDF6ED' }}>BASE $</th>
              <th style={{ width: 90,  background: '#EDF6ED' }}>TOTAL</th>
              {reps.map(r => (
                <th key={r.repId} colSpan={colSpanPerRep}
                    style={{ minWidth: colSpanPerRep === 2 ? 180 : 110, background: '#FFFFD4', fontSize: 11 }}>
                  <div>{r.repName || '-'}</div>
                  <div style={{ color: '#888', fontSize: 10 }}>{r.repCode || ''}</div>
                  {mode === 'default' && (
                    <select className="form-select form-select-sm mt-1" style={{ fontSize: 11, height: 'auto', padding: '1px 4px' }}
                      value={repTypes[r.repId] || 'dollar'}
                      onChange={e => onRepTypeChange(r.repId, e.target.value)}>
                      <option value="dollar">$ Dollar</option>
                      <option value="percent">% Percent</option>
                    </select>
                  )}
                </th>
              ))}
            </tr>
            {/* Totals row */}
            <tr className="fw-bold">
              <td colSpan={4} style={{ background: '#EDF6ED' }}></td>
              <td style={{ background: '#EDF6ED' }}>
                {fmtMoney(reps.reduce((s, r) => s + getRepTotal(r.repId), 0))}
              </td>
              {reps.map(r => (
                <td key={r.repId} colSpan={colSpanPerRep} style={{ background: '#FFFFD4' }}>
                  {fmtMoney(getRepTotal(r.repId))}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const iTotal = itemTotal(idx)
              const rawBaseDisp = grid[idx]?.[reps[0]?.repId]?.base
              const baseVal = (rawBaseDisp !== '' && rawBaseDisp != null) ? (parseFloat(rawBaseDisp) || 0) : 0
              const qty = item.qty || 0
              const msg = validationMsg(idx)
              return (
                <React.Fragment key={idx}>
                  <tr style={msg ? { outline: `1px solid ${msg.type === 'danger' ? '#dc3545' : '#ffc107'}` } : {}}>
                    <td style={{ textAlign: 'left' }}>
                      {item.item_name || '-'}
                      {item.item_size_name ? ` (${item.item_size_name})` : ''}
                    </td>
                    <td>{qty}</td>

                    {/* UNIT COST */}
                    <td>{mode === 'default' ? (item.unit_cost || 0).toFixed(2) : ''}</td>

                    {/* BASE $ — editable in default, dash in others */}
                    <td>
                      {mode === 'default' ? (
                        <input type="number" step="0.01" min="0"
                          className="form-control form-control-sm text-center"
                          style={{ width: 75, margin: '0 auto' }}
                          value={baseVal}
                          onChange={e => {
                            const v = e.target.value
                            reps.forEach(r => onGridChange(idx, r.repId, { base: v }))
                          }} />
                      ) : <span className="text-muted">-</span>}
                    </td>

                    {/* TOTAL — unit_cost − base_price in default, dash in others */}
                    <td style={{ fontWeight: 600 }}>
                      {mode === 'default' ? (
                        <span style={{ color: iTotal < 0 ? '#dc3545' : '#333' }}>
                          {iTotal.toFixed(2)}
                        </span>
                      ) : <span className="text-muted">-</span>}
                    </td>

                    {/* Rep cells */}
                    {reps.map(r => {
                      const cell = grid[idx]?.[r.repId] || {}
                      const type = repTypes[r.repId] || 'dollar'

                      if (mode === 'default') {
                        const cTotal = repCommTotal(idx, r.repId)
                        const hasError = msg && Math.abs(
                          reps.reduce((s, rr) => {
                            const t = repTypes[rr.repId] || 'dollar'
                            return s + (t === 'percent'
                              ? (parseFloat(grid[idx]?.[rr.repId]?.percent) || 0) / 100 * iTotal
                              : (parseFloat(grid[idx]?.[rr.repId]?.commission) || 0))
                          }, 0) - iTotal
                        ) >= 0.005

                        return (
                          <React.Fragment key={r.repId}>
                            {/* Input cell */}
                            <td style={{ background: '#FFFFD4' }}>
                              {type === 'percent' ? (
                                <input type="number" step="0.01" min="0" max="100"
                                  className={`form-control form-control-sm text-center${hasError ? ' border-danger' : ''}`}
                                  style={{ width: 65, margin: '0 auto' }}
                                  value={cell.percent || ''}
                                  placeholder="%"
                                  onChange={e => onGridChange(idx, r.repId, { percent: e.target.value })} />
                              ) : (
                                <input type="number" step="0.01" min="0"
                                  className={`form-control form-control-sm text-center${hasError ? ' border-danger' : ''}`}
                                  style={{ width: 65, margin: '0 auto' }}
                                  value={cell.commission || ''}
                                  placeholder="$"
                                  onChange={e => onGridChange(idx, r.repId, { commission: e.target.value })} />
                              )}
                            </td>
                            {/* Auto-total cell (readonly) */}
                            <td style={{ background: '#fff9c4', color: '#555', fontSize: 11 }}>
                              {cTotal > 0 ? cTotal.toFixed(2) : '0.00'}
                            </td>
                          </React.Fragment>
                        )
                      }

                      if (mode === 'percent') {
                        const calcDollar = Math.round((parseFloat(cell.percent) || 0) / 100 * poNetAmount * 100) / 100
                        return (
                          <React.Fragment key={r.repId}>
                            <td style={{ background: '#FFFFD4' }}>
                              <input type="number" step="0.01" min="0" max="100"
                                className="form-control form-control-sm text-center"
                                style={{ width: 60, margin: '0 auto' }}
                                value={cell.percent || ''}
                                placeholder="%"
                                onChange={e => {
                                  const pct = e.target.value
                                  const calc = (Math.round((parseFloat(pct) || 0) / 100 * poNetAmount * 100) / 100).toFixed(2)
                                  onGridChange(idx, r.repId, { percent: pct, commission: calc })
                                }} />
                            </td>
                            <td style={{ background: '#fff9c4', color: '#555', fontSize: 11 }}>
                              {calcDollar.toFixed(2)}
                            </td>
                          </React.Fragment>
                        )
                      }

                      // dollar mode
                      return (
                        <td key={r.repId} style={{ background: '#FFFFD4' }}>
                          <input type="number" step="0.01" min="0"
                            className="form-control form-control-sm text-center"
                            style={{ width: 75, margin: '0 auto' }}
                            value={cell.commission || ''}
                            placeholder="$"
                            onChange={e => onGridChange(idx, r.repId, { commission: e.target.value })} />
                        </td>
                      )
                    })}
                  </tr>
                  {msg && (
                    <tr>
                      <td colSpan={5 + reps.length * colSpanPerRep}
                          className={`text-${msg.type} py-1`} style={{ fontSize: 11 }}>
                        <i className="bi bi-exclamation-triangle me-1"></i>{msg.text}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
