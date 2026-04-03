import React, { useEffect, useState } from 'react'

export default function SlidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '450px',
  footer
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      setTimeout(() => setMounted(false), 300)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!mounted && !isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`position-fixed top-0 start-0 w-100 h-100 bg-black transition-opacity ${isOpen ? 'opacity-50' : 'opacity-0'}`} 
        style={{ zIndex: 1060, pointerEvents: isOpen ? 'auto' : 'none', cursor: 'pointer' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div 
        className={`position-fixed top-0 end-0 h-100 bg-white shadow-lg transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ 
          zIndex: 1070, 
          width: `clamp(320px, 90vw, ${width})`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center flex-shrink-0" 
             style={{ background: 'linear-gradient(to right, #f8fafc, #ffffff)' }}>
          <div>
            <h5 className="fw-bold mb-0 text-dark">{title}</h5>
            {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto flex-grow-1" style={{ scrollbarWidth: 'thin' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3 border-top bg-light flex-shrink-0">
            {footer}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transition-opacity { transition: opacity 0.3s ease; }
        .transition-transform { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .translate-x-full { transform: translateX(100%); }
        .translate-x-0 { transform: translateX(0); }
        .opacity-0 { opacity: 0; }
        .opacity-50 { opacity: 0.5; }
      `}} />
    </>
  )
}
