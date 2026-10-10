import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { DataProvider, useData, useMyAthlete } from './lib/data'
import { applyAccent } from './lib/athlete'
import { InstallPrompt } from './components/InstallPrompt'
import { Login } from './pages/Login'
import { Join } from './pages/Join'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Planning } from './pages/Planning'
import { AssignmentDetail } from './pages/AssignmentDetail'
import { Sessions } from './pages/Sessions'
import { SessionEditor } from './pages/SessionEditor'
import { Athletes } from './pages/Athletes'
import { AthleteDetail } from './pages/AthleteDetail'
import { Exercises } from './pages/Exercises'
import { Tips, TipDetail } from './pages/Tips'
import { Tests, TestDetail, TestEntry } from './pages/Tests'
import { AthleteHome } from './pages/athlete/AthleteHome'
import { AthleteSessions, AthleteSessionDetail } from './pages/athlete/AthleteSessions'
import { AthleteProgress } from './pages/athlete/AthleteProgress'
import { AthleteProfile } from './pages/athlete/AthleteProfile'

type NavItem = { to: string; label: string; icon: string }

const COACH_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/planning', label: 'Planning', icon: '📅' },
  { to: '/seances', label: 'Séances', icon: '📋' },
  { to: '/athletes', label: 'Athlètes', icon: '🏃' },
  { to: '/conseils', label: 'Conseils', icon: '💡' },
]

const ATHLETE_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/seances', label: 'Séances', icon: '📅' },
  { to: '/conseils', label: 'Conseils', icon: '💡' },
  { to: '/progres', label: 'Progrès', icon: '📈' },
  { to: '/profil', label: 'Profil', icon: '👤' },
]

function Shell({ nav, brand, right, children }: { nav: NavItem[]; brand: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { error } = useData()
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">{brand}</span>
        <nav className="topnav">
          {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}
        </nav>
        {right}
      </header>
      {api.mode === 'demo' && <div className="demo-banner">Mode démo – données enregistrées sur cet appareil uniquement</div>}
      {error && <div className="alert danger container">Erreur de chargement : {error}</div>}
      <main className="container">{children}</main>
      <nav className="bottomnav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span>{n.icon}</span>
            <small>{n.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function CoachApp() {
  const { me } = useData()
  useEffect(() => applyAccent(null), [])
  return (
    <Shell nav={COACH_NAV} brand={<>🏃 {me?.club_name ?? 'Coach Athlé'}</>}
      right={<button className="btn ghost small" onClick={() => api.signOut()}>Déconnexion</button>}>
      <InstallPrompt who="coach" />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/planning/:id" element={<AssignmentDetail />} />
        <Route path="/seances" element={<Sessions />} />
        <Route path="/seances/:id" element={<SessionEditor />} />
        <Route path="/exercices" element={<Exercises />} />
        <Route path="/athletes" element={<Athletes />} />
        <Route path="/athletes/:id" element={<AthleteDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/saisie" element={<TestEntry />} />
        <Route path="/tests/:id" element={<TestDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function AthleteApp() {
  const athlete = useMyAthlete()
  const { loading } = useData()
  useEffect(() => applyAccent(athlete?.color ?? null), [athlete?.color])
  if (!athlete) return <div className="login"><p className="muted">{loading ? 'Chargement…' : 'Profil introuvable.'}</p></div>
  return (
    <Shell nav={ATHLETE_NAV} brand={<>{athlete.avatar} {athlete.first_name}</>}>
      <Routes>
        <Route path="/" element={<AthleteHome />} />
        <Route path="/seances" element={<AthleteSessions />} />
        <Route path="/seances/:id" element={<AthleteSessionDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/progres" element={<AthleteProgress />} />
        <Route path="/profil" element={<AthleteProfile key={athlete.id} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function RoleGate() {
  const { me } = useData()
  if (!me) return <Login />
  if (me.role === 'coach') return <CoachApp />
  if (me.role === 'athlete') return <AthleteApp />
  return <Onboarding />
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Routes>
          <Route path="/rejoindre/:code" element={<Join />} />
          <Route path="/rejoindre/:code/:group" element={<Join />} />
          <Route path="*" element={<RoleGate />} />
        </Routes>
      </DataProvider>
    </HashRouter>
  )
}
