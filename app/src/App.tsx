import { HashRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { rememberedAthleteToken } from './lib/pwa'
import { InstallPrompt } from './components/InstallPrompt'
import { DataProvider, useData } from './lib/data'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Planning } from './pages/Planning'
import { AssignmentDetail } from './pages/AssignmentDetail'
import { Sessions } from './pages/Sessions'
import { SessionEditor } from './pages/SessionEditor'
import { Athletes } from './pages/Athletes'
import { AthleteDetail } from './pages/AthleteDetail'
import { Exercises } from './pages/Exercises'
import { AthletePortal, AthletePortalSession } from './pages/AthletePortal'

const NAV = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/planning', label: 'Planning', icon: '📅' },
  { to: '/seances', label: 'Séances', icon: '📋' },
  { to: '/athletes', label: 'Athlètes', icon: '🏃' },
  { to: '/exercices', label: 'Exercices', icon: '📚' },
]

function CoachLayout() {
  const { coach, error } = useData()
  if (!coach) {
    // Sur le téléphone d'un athlète, l'app rouvre directement son espace
    const token = rememberedAthleteToken()
    return token ? <Navigate to={`/a/${token}`} replace /> : <Login />
  }
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">🏃 Coach Athlé</span>
        <nav className="topnav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>
          ))}
        </nav>
        <button className="btn ghost small" onClick={() => api.signOut()}>Déconnexion</button>
      </header>
      {api.mode === 'demo' && (
        <div className="demo-banner">
          Mode démo – données enregistrées sur cet appareil uniquement
        </div>
      )}
      {error && <div className="alert danger container">Erreur de chargement : {error}</div>}
      <main className="container">
        <InstallPrompt who="coach" />
        <Outlet />
      </main>
      <nav className="bottomnav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span>{n.icon}</span>
            <small>{n.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Routes>
          <Route path="/a/:token" element={<AthletePortal />} />
          <Route path="/a/:token/s/:assignmentId" element={<AthletePortalSession />} />
          <Route element={<CoachLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/planning/:id" element={<AssignmentDetail />} />
            <Route path="/seances" element={<Sessions />} />
            <Route path="/seances/:id" element={<SessionEditor />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/athletes/:id" element={<AthleteDetail />} />
            <Route path="/exercices" element={<Exercises />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DataProvider>
    </HashRouter>
  )
}
