import { useState, useRef, useEffect } from 'react'

export default function ActionDropdown({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="position-relative d-inline-block" ref={ref}>
      <button className="btn btn-sm btn-outline-light border-0 text-secondary" onClick={() => setOpen(!open)}>
        <i className="bi bi-three-dots-vertical"></i>
      </button>
      {open && (
        <div className="dropdown-menu show shadow-sm border-0 end-0" style={{ position: 'absolute', right: 0, zIndex: 1050 }} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}
