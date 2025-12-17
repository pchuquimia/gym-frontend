import { useEffect, useState, useRef } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ThemeToggle from '../ThemeToggle'

function MainLayout({ children, activePage, onNavigate }) {
  const [activeTraining, setActiveTraining] = useState(null)
  const pollRef = useRef(null)

  const readSnapshot = () => {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('active_training')
    if (!raw) return null
    try {
      const snap = JSON.parse(raw)
      const hasElapsed = Number(snap?.elapsed || 0) > 0 || snap?.isRunning
      return hasElapsed ? snap : null
    } catch {
      return null
    }
  }

  useEffect(() => {
    const loadSnapshot = () => setActiveTraining(readSnapshot())
    loadSnapshot()
    window.addEventListener('storage', loadSnapshot)
    pollRef.current = setInterval(loadSnapshot, 1500)
    return () => {
      window.removeEventListener('storage', loadSnapshot)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    setActiveTraining(readSnapshot())
  }, [activePage])

  const handleReturnTraining = () => {
    if (typeof onNavigate === 'function') onNavigate('registrar')
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] flex flex-col transition-colors">
      {activePage !== 'registrar' && activeTraining && (
        <div className="sticky top-0 z-30 w-full bg-[color:var(--card)] border-b border-[color:var(--border)] shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 md:px-8">
            <div className="text-sm text-[color:var(--text-muted)]">
              Sesion en curso ·
              <span className="ml-1 font-semibold text-[color:var(--text)]">
                {String(Math.floor((activeTraining.elapsed || 0) / 60)).padStart(2, '0')}:
                {String((activeTraining.elapsed || 0) % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={handleReturnTraining}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2 shadow-sm hover:bg-blue-700 transition-colors"
            >
              Volver al entrenamiento
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[260px_1fr] max-md:grid-cols-1 flex-1">
        <div className="hidden md:block">
          <Sidebar activePage={activePage} onNavigate={onNavigate} />
        </div>
        <div className="px-4 py-4 md:px-8 md:py-8">
          <div className="flex items-center justify-end mb-4 gap-3">
            <ThemeToggle />
          </div>
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>
      <div className="md:hidden sticky bottom-0">
        <MobileNav activePage={activePage} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

export default MainLayout
