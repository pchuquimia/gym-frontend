import { useMemo, useState } from 'react'
import './App.css'
import Dashboard from './pages/Dashboard'
import ExerciseLibrary from './pages/ExerciseLibrary'
import MainLayout from './components/layout/MainLayout'
import RegisterTraining from './pages/RegisterTraining'
import ExerciseAnalyticsPage from './pages/ExerciseAnalyticsPage'
import SessionSummaryPage from './pages/SessionSummaryPage'
import Routines from './pages/Routines'
import ProfileSettings from './pages/ProfileSettings'
import PhotosLibrary from './pages/PhotosLibrary'
import TrainingAdmin from './pages/TrainingAdmin'
import Goals from './pages/Goals'
import { TrainingProvider } from './context/TrainingContext'
import { RoutineProvider } from './context/RoutineContext'
import { UserProvider } from './context/UserContext'

const PAGES = {
  dashboard: { label: 'Dashboard', component: Dashboard },
  library: { label: 'Biblioteca de Ejercicios', component: ExerciseLibrary },
  registrar: { label: 'Registrar Entrenamiento', component: RegisterTraining },
  ejercicio_analitica: { label: 'Exercise Analytics', component: ExerciseAnalyticsPage },
  resumen_sesion: { label: 'Resumen de Sesión', component: SessionSummaryPage },
  rutinas: { label: 'Rutinas y Planificación', component: Routines },
  admin_sesiones: { label: 'Administrar sesiones', component: TrainingAdmin },
  perfil: { label: 'Perfil y Ajustes', component: ProfileSettings },
  fotos: { label: 'Biblioteca de Fotos', component: PhotosLibrary },
  objetivos: { label: 'Objetivos', component: Goals },
}

function App() {
  const [activePage, setActivePage] = useState(() => {
    if (typeof localStorage === 'undefined') return 'dashboard'
    const stored = localStorage.getItem('active_page')
    return stored || 'dashboard'
  })

  const handleNavigate = (page) => {
    setActivePage(page)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('active_page', page)
    }
  }

  const pageEntry = useMemo(() => PAGES[activePage] || PAGES.dashboard, [activePage])
  const PageComponent = pageEntry.component

  return (
    <TrainingProvider>
      <RoutineProvider>
        <UserProvider>
          <MainLayout activePage={activePage} onNavigate={handleNavigate}>
            <PageComponent pageKey={pageEntry.label} onNavigate={handleNavigate} />
          </MainLayout>
        </UserProvider>
      </RoutineProvider>
    </TrainingProvider>
  )
}

export default App

