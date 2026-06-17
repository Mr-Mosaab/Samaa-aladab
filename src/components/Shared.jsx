import { useEffect } from 'react'

export function Masthead({ tagline }) {
  return (
    <header className="masthead">
      <img className="mark" src="/logo.jpg" alt="شعار سماء الأدب" />
      <h1>سماء الأدب</h1>
      {tagline && <p className="tagline">{tagline}</p>}
      <div className="rule" />
    </header>
  )
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return <div className="toast">{message}</div>
}

export function Spinner() {
  return <div className="spinner" aria-label="جارٍ التحميل" />
}

const NAV = [
  { id: 'register', label: 'تسجيل', icon: '🪶' },
  { id: 'stats', label: 'الإحصائيات', icon: '📊' },
  { id: 'admin', label: 'الإدارة', icon: '🔒' },
]

export function BottomNav({ page, setPage }) {
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${page === n.id ? 'active' : ''}`}
          onClick={() => setPage(n.id)}
          aria-current={page === n.id ? 'page' : undefined}
        >
          <span className="nav-icon">{n.icon}</span>
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
