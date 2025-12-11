import { useMemo, useState } from 'react'
import './App.css'
import Dashboard from './pages/Dashboard'
import ExerciseLibrary from './pages/ExerciseLibrary'
import MainLayout from './components/layout/MainLayout'
import ComingSoon from './components/shared/ComingSoon'
import RegisterTraining from './pages/RegisterTraining'
import ProgressHistory from './pages/ProgressHistory'
import Analytics from './pages/Analytics'
import Routines from './pages/Routines'
import ProfileSettings from './pages/ProfileSettings'
import PhotosLibrary from './pages/PhotosLibrary'
import { TrainingProvider } from './context/TrainingContext'
import { RoutineProvider } from './context/RoutineContext'
import { UserProvider } from './context/UserContext'

const PAGES = {
  dashboard: { label: 'Dashboard', component: Dashboard },
  library: { label: 'Biblioteca de Ejercicios', component: ExerciseLibrary },
  registrar: { label: 'Registrar Entrenamiento', component: RegisterTraining },
  historial: { label: 'Historial de Progreso', component: ProgressHistory },
  graficos: { label: 'Gráficos y Análisis', component: Analytics },
  rutinas: { label: 'Rutinas y Planificación', component: Routines },
  perfil: { label: 'Perfil y Ajustes', component: ProfileSettings },
  fotos: { label: 'Biblioteca de Fotos', component: PhotosLibrary },
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')

  const pageEntry = useMemo(() => PAGES[activePage] || PAGES.dashboard, [activePage])
  const PageComponent = pageEntry.component

  return (
    <TrainingProvider>
      <RoutineProvider>
        <UserProvider>
          <MainLayout activePage={activePage} onNavigate={setActivePage}>
            <PageComponent pageKey={pageEntry.label} onNavigate={setActivePage} />
          </MainLayout>
        </UserProvider>
      </RoutineProvider>
    </TrainingProvider>
  )
}

export default App
