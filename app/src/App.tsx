import { Icon } from './components/Icon'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { DataProvider, useData, useMyAthlete } from './lib/data'
import { applyAccent } from './lib/athlete'
import { InstallPrompt } from './components/InstallPrompt'
import { Logo } from './components/Logo'
import { AppLock } from './components/AppLock'
import { logout } from './lib/lock'
import { Login } from './pages/Login'
import { Join } from './pages/Join'
import { CoachJoin } from './pages/CoachJoin'
const DbUpdate = lazy(() => import('./pages/DbUpdate').then((m) => ({ default: m.DbUpdate })))
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Planning } from './pages/Planning'
import { AssignmentDetail } from './pages/AssignmentDetail'
import { ExportSessions } from './pages/ExportSessions'
import { WhoDoesWhat } from './pages/WhoDoesWhat'
import { Messages } from './pages/Messages'
import { feedbackToAnswer, unreadByAthlete, unreadByCoach } from './lib/messages'
import { NotificationsSetup } from './pages/NotificationsSetup'
import { Settings } from './pages/Settings'
import { MondayToday } from './pages/monday/MondayToday'
import { MondayEdit, MondayPlan } from './pages/monday/MondayPlan'
import { MondayImport } from './pages/monday/MondayImport'
import { Sessions } from './pages/Sessions'
import { SessionEditor } from './pages/SessionEditor'
import { Athletes } from './pages/Athletes'
import { AthleteDetail } from './pages/AthleteDetail'
import { Exercises } from './pages/Exercises'
import { Tips, TipDetail } from './pages/Tips'
import { Tests, TestDetail, TestEntry, TestMatrix } from './pages/Tests'
import { ImportResults } from './pages/ImportResults'
import { ImportSessions } from './pages/ImportSessions'
import { ImportProfiles } from './pages/ImportProfiles'
import { Competitions } from './pages/Competitions'
import { Assistant } from './pages/Assistant'
import { SprintPaces } from './pages/SprintPaces'
import { AthleteHome } from './pages/athlete/AthleteHome'
import { AthleteSessions, AthleteSessionDetail } from './pages/athlete/AthleteSessions'
import { AthleteProgress } from './pages/athlete/AthleteProgress'
import { AthleteProfile } from './pages/athlete/AthleteProfile'

type NavItem = { to: string; label: string; icon: string }

const COACH_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/planning', label: 'Planning', icon: 'calendar' },
  { to: '/seances', label: 'Séances', icon: 'list' },
  { to: '/athletes', label: 'Athlètes', icon: 'users' },
  { to: '/competitions', label: 'Compét.', icon: 'trophy' },
  { to: '/messages', label: 'Messages', icon: 'message' },
]

const ATHLETE_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/seances', label: 'Séances', icon: 'calendar' },
  { to: '/conseils', label: 'Conseils', icon: 'bulb' },
  { to: '/progres', label: 'Progrès', icon: 'chart' },
  { to: '/profil', label: 'Profil', icon: 'user' },
]

function Shell({ nav, brand, right, children }: { nav: NavItem[]; brand: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { error, me, messages, feedback } = useData()
  // Pastille du menu Messages : non lus (+ retours sans réponse pour le coach)
  const badge = me?.role === 'coach' ? unreadByCoach(messages).length + feedbackToAnswer(feedback, messages).length : unreadByAthlete(messages).length
  const dot = (to: string) => (to === '/messages' && badge > 0 ? <b className="nav-badge" aria-label={`${badge} à lire`}>{badge}</b> : null)
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">{brand}</span>
        <nav className="topnav">
          {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="nav-ico" aria-hidden><Icon name={n.icon} /></span>{n.label}{dot(n.to)}</NavLink>)}
        </nav>
        {right}
      </header>
      {api.mode === 'demo' && <div className="demo-banner">Mode démo – données enregistrées sur cet appareil uniquement</div>}
      {error && <div className="alert danger container">Erreur de chargement : {error}</div>}
      <main className="container">{children}</main>
      <nav className="bottomnav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span><Icon name={n.icon} />{dot(n.to)}</span>
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
    <Shell nav={COACH_NAV} brand={<><Logo kind="symbol" className="brand-logo" /><span className="brand-name">{me?.club_name ?? 'Coach Athlé'}</span></>}
      right={<button className="btn ghost small" onClick={() => logout(me?.email, api.signOut)}>Déconnexion</button>}>
      <InstallPrompt who="coach" />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/messages" element={<Messages coach />} />
        <Route path="/notifications" element={<NotificationsSetup />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="/lundi" element={<MondayToday />} />
        <Route path="/lundi/plan" element={<MondayPlan />} />
        <Route path="/lundi/plan/:date" element={<MondayEdit />} />
        <Route path="/lundi/import" element={<MondayImport />} />
        <Route path="/planning/athletes" element={<WhoDoesWhat />} />
        <Route path="/planning/export" element={<ExportSessions />} />
        <Route path="/planning/:id" element={<AssignmentDetail />} />
        <Route path="/seances" element={<Sessions />} />
        <Route path="/seances/import" element={<ImportSessions />} />
        <Route path="/seances/:id" element={<SessionEditor />} />
        <Route path="/exercices" element={<Exercises />} />
        <Route path="/athletes" element={<Athletes />} />
        <Route path="/athletes/questionnaire" element={<ImportProfiles />} />
        <Route path="/athletes/:id" element={<AthleteDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/saisie" element={<TestEntry />} />
        <Route path="/tests/tableau" element={<TestMatrix />} />
        <Route path="/tests/allures-sprint" element={<SprintPaces />} />
        <Route path="/tests/import" element={<ImportResults />} />
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
    <Shell nav={ATHLETE_NAV} brand={<><Logo kind="symbol" className="brand-logo" /><span className="brand-name">{athlete.first_name}</span></>}>
      <Routes>
        <Route path="/" element={<AthleteHome />} />
        <Route path="/seances" element={<AthleteSessions />} />
        <Route path="/seances/:id" element={<AthleteSessionDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/progres" element={<AthleteProgress />} />
        <Route path="/messages" element={<Messages coach={false} />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/profil" element={<AthleteProfile key={athlete.id} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function RoleGate() {
  const { me } = useData()
  if (!me) return <Login />
  return (
    <AppLock key={me.email} email={me.email}>
      {me.role === 'coach' ? <CoachApp /> : me.role === 'athlete' ? <AthleteApp /> : <Onboarding />}
    </AppLock>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Routes>
          <Route path="/rejoindre/:code" element={<Join />} />
          <Route path="/rejoindre/:code/:group" element={<Join />} />
          <Route path="/entraineur/:token" element={<CoachJoin />} />
          <Route path="/base" element={<Suspense fallback={null}><DbUpdate /></Suspense>} />
          <Route path="*" element={<RoleGate />} />
        </Routes>
      </DataProvider>
    </HashRouter>
  )
}
