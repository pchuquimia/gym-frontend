import { useEffect, useState, useRef } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ThemeToggle from '../ThemeToggle'

const SNAPSHOT_KEY = 'active_training_snapshot'
const LEGACY_KEY = 'active_training'

function MainLayout({ children, activePage, onNavigate }) {
  const [activeTraining, setActiveTraining] = useState(null)
  const pollRef = useRef(null)
  const [showDrawer, setShowDrawer] = useState(false)

  const formatDuration = (sec) => {
    const total = Math.max(0, Math.floor(sec || 0))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
  }

  const readSnapshot = () => {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(SNAPSHOT_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    try {
      const snap = JSON.parse(raw)
      let elapsed = Number(snap?.elapsed ?? snap?.durationSeconds ?? 0)
      if (snap?.isRunning && snap?.lastUpdate) {
        elapsed += Math.max(0, (Date.now() - snap.lastUpdate) / 1000)
      }
      const total = Math.max(0, Math.floor(elapsed))
      const hasElapsed = total > 0 || snap?.isRunning
      return hasElapsed ? { ...snap, elapsed: total } : null
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
            <div className="text-sm text-[color:var(--text-muted)] flex items-center gap-1">
              <span>Sesión en curso</span>
              <span className="ml-1 font-semibold text-[color:var(--text)] font-mono">
                {formatDuration(activeTraining.elapsed || 0)}
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
      <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 flex-1">
        <div className="hidden md:block">
          <Sidebar activePage={activePage} onNavigate={onNavigate} />
        </div>
        <div className="px-4 py-4 md:px-8 md:py-8">
          <div className="flex items-center justify-between mb-4 gap-3">
            <button
              type="button"
              className="md:hidden inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-medium text-[color:var(--text)]"
              onClick={() => setShowDrawer(true)}
            >
              <Menu className="w-4 h-4" />
              Menú
            </button>
            <div className="flex-1" />
            <ThemeToggle />
          </div>
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>

      {/* Off-canvas Drawer for mobile */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-[color:var(--card)] border-r border-[color:var(--border)] shadow-2xl">
            <Sidebar forceVisible activePage={activePage} onNavigate={(id) => { setShowDrawer(false); onNavigate?.(id); }} />
          </div>
        </div>
      )}

      <div className="hidden">
        <MobileNav activePage={activePage} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

export default MainLayout
